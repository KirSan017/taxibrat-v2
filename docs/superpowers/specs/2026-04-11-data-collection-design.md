# Сбор данных о таксопарках — Спецификация

## 1. Цель

Наполнить каталог ТаксиБрат 100+ парками Москвы и МО за счёт автоматического парсинга открытых источников + ручной верификации топ-20.

## 2. Архитектура

Три слоя:

### 2.1 Парсеры (источники)
Отдельный модуль на каждый источник, реализует общий интерфейс:

```typescript
interface Parser {
  source: "YANDEX_MAPS" | "AVITO" | "TAXI_MSK" | "TELEGRAM" | "OTHER";
  parse(): AsyncGenerator<RawParkInput>;
}
```

Генератор вместо массива — для постепенной записи в БД.

Модули:
- `src/lib/parsers/yandex-maps.ts`
- `src/lib/parsers/avito.ts`
- `src/lib/parsers/taxi-msk.ts`

### 2.2 Обработчик (мёрдж)
`src/lib/raw-data-processor.ts`:
- Принимает `RawParkInput`
- Нормализует телефон (`+7XXXXXXXXXX`)
- Ищет совпадение в `TaxiPark.phone`:
  - Если найдено — сохраняет запись в `RawParkData` со статусом `DUPLICATE` и `mergedToParkId = existing.id`, добавляет `sourceUrl` в `TaxiPark.sources` (если там ещё нет)
  - Если не найдено — создаёт запись в `RawParkData` со статусом `PENDING`
- Запускает `red-flags-detector.ts` в обоих случаях

### 2.3 Админка (ревью)
Раздел `/admin/raw-data` — очередь спарсенных карточек с фильтрами, drawer'ом и тремя действиями.

## 3. Модель данных

### 3.1 Новая таблица `RawParkData`

```
id              String @id @default(cuid())
source          SourceType
sourceUrl       String
sourceId        String? // внешний ID объявления
parsedAt        DateTime @default(now())
parsedBy        String? // user ID или "cli"

// Базовые
rawName         String
phone           String? // нормализованный +7XXX
address         String?
website         String?
telegramLink    String?

// Условия
rentPrice       Int?
deposit         Int?
schedule        String? // строка, не enum (парсер)
driverClass     String?
brand           String?
model           String?
year            Int?
fuelType        String?

// Обработка
status          RawDataStatus @default(PENDING)
mergedToParkId  String?
mergedToPark    TaxiPark? @relation(fields: [mergedToParkId], references: [id])
rejectionReason String?

// Red flags
redFlags        Json? // [{keyword, context, severity}]

// Сырой текст
rawText         String? @db.Text
```

### 3.2 Новые enum'ы

```
enum SourceType {
  YANDEX_MAPS
  AVITO
  TAXI_MSK
  TELEGRAM
  OTHER
}

enum RawDataStatus {
  PENDING
  MERGED
  REJECTED
  DUPLICATE
}

enum VerificationLevel {
  RAW      // только парсинг
  BASIC    // админ проверил данные
  VERIFIED // тайный покупатель съездил
}
```

### 3.3 Изменения `TaxiPark`

Добавить:
```
verificationLevel VerificationLevel @default(VERIFIED)
sources           String[] // URL источников
phone             String? // для авто-дедупликации (если ещё нет — добавить)
```

Существующие записи получают `verificationLevel = VERIFIED` по умолчанию (ретроактивно).

## 4. Парсинг

### 4.1 Стек
- `cheerio` — HTML-парсинг
- `playwright` (fallback для JS-страниц)
- `p-queue` — контроль параллелизма
- User-Agent rotation из массива реалистичных браузерных строк
- Retry с exponential backoff при 429/503
- **Агрессивный режим**: игнорируем robots.txt, параллельные запросы, минимальные паузы

### 4.2 Pipeline
1. Получить список URL карточек (через поиск/категорию)
2. Для каждого URL — запросить страницу, извлечь поля, нормализовать телефон
3. Передать в `raw-data-processor.ts`
4. Processor сохраняет в БД, вызывает детектор флагов

### 4.3 CLI-команды (`package.json`)

```json
"scripts": {
  "parse:yandex": "tsx src/scripts/parse-yandex.ts",
  "parse:avito": "tsx src/scripts/parse-avito.ts",
  "parse:catalogs": "tsx src/scripts/parse-catalogs.ts",
  "parse:all": "tsx src/scripts/parse-all.ts"
}
```

## 5. Red flags detector

### 5.1 Словарь (`src/lib/red-flags-dictionary.ts`)

```typescript
export const RED_FLAGS = {
  HIGH: [
    "залог удерживается",
    "штраф за досрочный возврат",
    "скрытые платежи",
    "обязательная предоплата",
  ],
  MEDIUM: [
    "минимум смен",
    "обязательно отработать",
    "комиссия за вывод",
    "штраф за опоздание",
  ],
  LOW: [
    "только через приложение",
    "работа от",
    "минимальный стаж",
  ],
};
```

### 5.2 Функция

```typescript
// src/lib/red-flags-detector.ts
export function detectRedFlags(text: string): RedFlag[]
```

Ищет все ключевые слова в тексте, возвращает массив:
```typescript
interface RedFlag {
  keyword: string;
  context: string;  // ±50 символов вокруг
  severity: "HIGH" | "MEDIUM" | "LOW";
}
```

Пустой массив если ничего не найдено.

## 6. Админка: страница `/admin/raw-data`

### 6.1 Верх страницы
- **Счётчики**: Всего / На ревью / Объединено / Отклонено
- **Кнопки парсинга**: "Запустить Яндекс", "Запустить Авито", "Запустить все"
  - При клике — POST `/api/admin/parsing/start`
  - Toast "Парсинг запущен"
  - Polling `/api/admin/parsing/status` каждые 5 секунд пока идёт
- **Фильтры**: источник, статус, наличие флагов (HIGH/MEDIUM/LOW/нет)

### 6.2 Таблица
Колонки: Название | Источник (бейдж) | Телефон | Цена | Красные флаги (цветные точки) | Дата | Статус | Действия

### 6.3 Drawer справа (клик по строке)
- Все собранные поля с редактированием
- Блок "Красные флаги" — список с цитатой
- Блок "Сырой текст" — свёрнут по умолчанию
- Ссылка на `sourceUrl`

Три действия:
1. **Создать новый парк** — открывает форму создания `TaxiPark` с предзаполненными данными. При сохранении `status = MERGED`, `mergedToParkId = newPark.id`, `verificationLevel = BASIC` (админ уже проверил)
2. **Прикрепить к существующему** — autocomplete по `TaxiPark`, при выборе заполняет пустые поля, дополняет `sources`
3. **Отклонить** — модалка с причиной, `status = REJECTED`

### 6.4 Автообработка дубликатов
Processor сам ищет совпадение по нормализованному телефону. Если найдено — `status = DUPLICATE`, `mergedToParkId` установлен. В таблице — бейдж "Авто-дубликат", можно подтвердить или пересобрать.

## 7. API

Новые роуты:

```
POST /api/admin/parsing/start       — запуск парсера (body: { source })
GET  /api/admin/parsing/status      — текущий статус (running/idle, progress)
GET  /api/admin/raw-data            — список с фильтрами
GET  /api/admin/raw-data/[id]       — одна запись
POST /api/admin/raw-data/[id]/merge — создать новый парк и связать
POST /api/admin/raw-data/[id]/attach — прикрепить к существующему (body: { parkId })
POST /api/admin/raw-data/[id]/reject — отклонить (body: { reason })
```

Все защищены `requireRole(["ADMIN", "MANAGER"])`.

Парсинг работает в Node-процессе через `p-queue`, статус хранится в памяти процесса (module-level `parsingState`). Для MVP достаточно.

## 8. Интеграция с фронтом водителя

### 8.1 Поведение по `verificationLevel`

**VERIFIED** (полная карточка):
- Рейтинг из 27 параметров
- Все условия
- Кнопка "Узнать название" через стандартную верификацию

**BASIC** (базовые данные):
- Класс, цена, график
- Бейдж "Базовые данные"
- "Узнать название" работает, но с уточнением "не верифицированы"

**RAW** (только парсинг):
- Класс, примерная цена
- Бейдж "Нужна верификация"
- Кнопка **"Запросить проверку"** — создаёт `VerificationRequest` с типом `PARK_AUDIT_REQUEST`
- Менеджер ставит парк в очередь на выезд
- Водитель получает уведомление в Telegram когда парк будет проверен

### 8.2 Фильтр в каталоге
Группа "Уровень проверки":
- ☑ Верифицированы (по умолчанию)
- ☑ Базовые данные (по умолчанию)
- ☐ Только парсинг (по умолчанию выключен)

### 8.3 Счётчик на лендинге
Над топ-3: "В каталоге: {verified} проверенных, {basic+raw}+ на очереди".

### 8.4 Новый тип `VerificationRequest`
Добавить поле `type` в модель:
```
enum VerificationType {
  DRIVER_VERIFICATION
  PARK_AUDIT_REQUEST
}
```

Существующие записи получают `DRIVER_VERIFICATION` по умолчанию.

## 9. Scope

### Входит
- Таблица `RawParkData` + миграция
- Поля `verificationLevel`, `sources`, `phone` в `TaxiPark`
- Поле `type` в `VerificationRequest`
- Парсеры: Яндекс.Карты, Авито, taxi-msk.ru
- Общий интерфейс `Parser` + pipeline
- Red flags detector со словарём ~30 триггеров
- Auto-merge по нормализованному телефону
- CLI-команды (`npm run parse:*`)
- API для запуска парсинга + polling статуса
- Страница `/admin/raw-data`: таблица, фильтры, drawer, 3 действия
- Бейджи `VERIFIED/BASIC/RAW` в каталоге
- Фильтр уровня проверки в каталоге
- Кнопка "Запросить проверку" для RAW-парков
- Счётчик на лендинге

### Не входит
- Парсинг Telegram-каналов
- NLP для извлечения условий из свободного текста
- Фоновая очередь через BullMQ (для MVP хватит `p-queue` в процессе)
- Автоматический уведомления о новых записях
- Периодический ре-парсинг
- Экспорт в CSV
- Прокси-пул

### Риски
1. **Ломающиеся парсеры** — Яндекс и Авито могут менять разметку. Решение: тесты с фикстурами, мониторинг успешности парсинга
2. **Бан IP на Авито** — если словим, переключиться на `playwright` с ротацией UA
3. **Юридический риск** — агрессивный парсинг противоречит ToS. Перед публичным релизом как B2B — пересмотреть на вежливый режим
