// Shared label maps between enum values (from @taxibrat/shared) and UI.

export const DRIVER_CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Эконом",
  COMFORT: "Комфорт",
  COMFORT_PLUS: "Комфорт+",
  BUSINESS: "Бизнес",
  PREMIER: "Премьер",
  ELITE: "Элит",
};

export const DRIVER_CLASS_FROM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(DRIVER_CLASS_LABELS).map(([k, v]) => [v, k]),
);

export const DISTRICT_LABELS: Record<string, string> = {
  CAO: "ЦАО",
  SAO: "САО",
  SVAO: "СВАО",
  VAO: "ВАО",
  UVAO: "ЮВАО",
  UAO: "ЮАО",
  UZAO: "ЮЗАО",
  ZAO: "ЗАО",
  SZAO: "СЗАО",
  MYTISCHI: "Мытищи",
  KRASNOGORSK: "Красногорск",
  DOLGOPRUDNY: "Долгопрудный",
  KHIMKI: "Химки",
  ODINTSOVO: "Одинцово",
  NOVOMOSKOVSKY: "Новомосковский",
  BUTOVO: "Бутово",
  VIDNOE: "Видное",
  LUBERTSY: "Люберцы",
  REUTOV: "Реутов",
  BALASHIKHA: "Балашиха",
};

export const DISTRICT_FROM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICT_LABELS).map(([k, v]) => [v, k]),
);

export const OWNER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Физ лицо",
  LEGAL_ENTITY: "ЮР лицо",
  TAXI_PARK: "Таксопарк",
  BANK: "Банк",
};

export const OWNER_TYPE_FROM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(OWNER_TYPE_LABELS).map(([k, v]) => [v, k]),
);
