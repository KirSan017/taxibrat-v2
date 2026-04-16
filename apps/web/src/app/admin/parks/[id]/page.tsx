"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── types ────────────────────────────────────────────── */

interface ClassParams {
  name: string;
  deposit: string;
  dailyRent: string;
  commission: string;
  minPayout: string;
  fuelIncluded: string;
  gpsTracker: string;
  insurance: string;
  maintenanceIncluded: string;
  tireChange: string;
  carWash: string;
  penalty: string;
  cancellationFee: string;
  mileageLimit: string;
  overtimeFee: string;
  minTerm: string;
  maxTerm: string;
  parkingIncluded: string;
  supportHours: string;
  bonusProgram: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: string;
  licensePlate: string;
}

interface ParkClass {
  id: string;
  name: string;
  params: ClassParams;
  vehicles: Vehicle[];
}

const PARAM_LABELS: Record<keyof ClassParams, string> = {
  name: "Название класса",
  deposit: "Депозит, руб.",
  dailyRent: "Суточная аренда, руб.",
  commission: "Комиссия, %",
  minPayout: "Мин. выплата, руб.",
  fuelIncluded: "Топливо включено",
  gpsTracker: "GPS-трекер",
  insurance: "Страховка",
  maintenanceIncluded: "ТО включено",
  tireChange: "Замена шин",
  carWash: "Мойка",
  penalty: "Штраф за нарушения, руб.",
  cancellationFee: "Штраф за отмену, руб.",
  mileageLimit: "Лимит пробега, км/день",
  overtimeFee: "Плата за превышение, руб./км",
  minTerm: "Мин. срок аренды, дней",
  maxTerm: "Макс. срок аренды, дней",
  parkingIncluded: "Парковка включена",
  supportHours: "Часы поддержки",
  bonusProgram: "Бонусная программа",
};

const EMPTY_PARAMS: ClassParams = {
  name: "", deposit: "", dailyRent: "", commission: "", minPayout: "",
  fuelIncluded: "", gpsTracker: "", insurance: "", maintenanceIncluded: "",
  tireChange: "", carWash: "", penalty: "", cancellationFee: "",
  mileageLimit: "", overtimeFee: "", minTerm: "", maxTerm: "",
  parkingIncluded: "", supportHours: "", bonusProgram: "",
};

/* ── mock data ────────────────────────────────────────── */

const DISTRICTS = ["ЦАО", "САО", "СВАО", "ВАО", "ЮВАО", "ЮАО", "ЮЗАО", "ЗАО", "СЗАО", "ЗелАО", "ТАО", "НАО"];

const MOCK_CLASSES: ParkClass[] = [
  {
    id: "c1",
    name: "Эконом",
    params: {
      ...EMPTY_PARAMS,
      name: "Эконом",
      deposit: "5000",
      dailyRent: "1800",
      commission: "3",
      minPayout: "1000",
      fuelIncluded: "Нет",
      gpsTracker: "Да",
      insurance: "ОСАГО",
      maintenanceIncluded: "Да",
      tireChange: "Да",
      carWash: "1 раз/нед",
      penalty: "3000",
      cancellationFee: "500",
      mileageLimit: "300",
      overtimeFee: "8",
      minTerm: "1",
      maxTerm: "365",
      parkingIncluded: "Нет",
      supportHours: "24/7",
      bonusProgram: "Нет",
    },
    vehicles: [
      { id: "v1", brand: "Hyundai", model: "Solaris", year: "2023", licensePlate: "А123БВ777" },
      { id: "v2", brand: "Kia", model: "Rio", year: "2022", licensePlate: "В456ГД777" },
    ],
  },
  {
    id: "c2",
    name: "Комфорт",
    params: {
      ...EMPTY_PARAMS,
      name: "Комфорт",
      deposit: "10000",
      dailyRent: "2500",
      commission: "2",
      minPayout: "2000",
      fuelIncluded: "Нет",
      gpsTracker: "Да",
      insurance: "КАСКО + ОСАГО",
      maintenanceIncluded: "Да",
      tireChange: "Да",
      carWash: "2 раз/нед",
      penalty: "5000",
      cancellationFee: "1000",
      mileageLimit: "350",
      overtimeFee: "10",
      minTerm: "7",
      maxTerm: "365",
      parkingIncluded: "Да",
      supportHours: "24/7",
      bonusProgram: "Да",
    },
    vehicles: [
      { id: "v3", brand: "Skoda", model: "Octavia", year: "2024", licensePlate: "Е789ЖЗ799" },
    ],
  },
];

/* ── page ─────────────────────────────────────────────── */

export default function AdminParkEditPage() {
  const [parkName, setParkName] = useState("Таксопарк «Альфа Драйв»");
  const [address, setAddress] = useState("г. Москва, ул. Ленина, 42");
  const [phone, setPhone] = useState("+7 (495) 123-45-67");
  const [district, setDistrict] = useState("ЦАО");
  const [classes, setClasses] = useState<ParkClass[]>(MOCK_CLASSES);
  const [expandedClass, setExpandedClass] = useState<string | null>("c1");

  const toggleClass = (id: string) => {
    setExpandedClass(expandedClass === id ? null : id);
  };

  const updateParam = (classId: string, key: keyof ClassParams, value: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, params: { ...c.params, [key]: value } } : c
      )
    );
  };

  const addClass = () => {
    const newId = `c${Date.now()}`;
    setClasses((prev) => [
      ...prev,
      { id: newId, name: "Новый класс", params: { ...EMPTY_PARAMS, name: "Новый класс" }, vehicles: [] },
    ]);
    setExpandedClass(newId);
  };

  const addVehicle = (classId: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? {
              ...c,
              vehicles: [
                ...c.vehicles,
                { id: `v${Date.now()}`, brand: "", model: "", year: "", licensePlate: "" },
              ],
            }
          : c
      )
    );
  };

  const removeVehicle = (classId: string, vehicleId: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? { ...c, vehicles: c.vehicles.filter((v) => v.id !== vehicleId) }
          : c
      )
    );
  };

  return (
    <div className="max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/parks" className="text-[#A1A1A1] hover:text-[#303030] transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12,19 5,12 12,5" />
          </svg>
        </Link>
        <h1 className="text-xl font-medium text-[#303030]">Редактирование таксопарка</h1>
      </div>

      {/* Basic info */}
      <section className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6">
        <h2 className="text-base font-medium text-[#303030] mb-4">Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Название" value={parkName} onChange={(e) => setParkName(e.target.value)} />
          <Input label="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="w-full">
            <label className="block text-sm font-medium text-[#303030] mb-1.5">Район</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full h-[49px] px-4 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors bg-white"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-[#303030]">Классы автомобилей</h2>
          <Button size="sm" variant="outline" onClick={addClass}>+ Добавить класс</Button>
        </div>

        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => toggleClass(cls.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#303030]">{cls.params.name || cls.name}</span>
                  <span className="text-xs text-[#A1A1A1]">{cls.vehicles.length} авто</span>
                </div>
                <svg
                  className={`w-5 h-5 text-[#A1A1A1] transition-transform ${expandedClass === cls.id ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {/* Accordion body */}
              {expandedClass === cls.id && (
                <div className="border-t border-[#E5E5E5] px-6 py-5">
                  {/* Parameters grid */}
                  <h3 className="text-sm font-medium text-[#303030] mb-3">Параметры</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {(Object.keys(PARAM_LABELS) as (keyof ClassParams)[]).map((key) => (
                      <div key={key}>
                        <label className="block text-xs text-[#A1A1A1] mb-1">{PARAM_LABELS[key]}</label>
                        <input
                          type="text"
                          value={cls.params[key]}
                          onChange={(e) => updateParam(cls.id, key, e.target.value)}
                          className="w-full h-[38px] px-3 border border-[#E5E5E5] rounded-lg text-sm text-[#303030] outline-none focus:border-[#303030] transition-colors"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Vehicles */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[#303030]">Автомобили</h3>
                    <button
                      onClick={() => addVehicle(cls.id)}
                      className="text-xs text-[#303030] hover:text-[#A1A1A1] transition-colors"
                    >
                      + Добавить авто
                    </button>
                  </div>

                  {cls.vehicles.length === 0 ? (
                    <p className="text-xs text-[#A1A1A1]">Нет автомобилей</p>
                  ) : (
                    <div className="space-y-2">
                      {cls.vehicles.map((v) => (
                        <div key={v.id} className="flex items-center gap-3 bg-[#FAFAFA] rounded-lg p-3">
                          <input
                            type="text"
                            placeholder="Марка"
                            defaultValue={v.brand}
                            className="flex-1 h-[34px] px-3 border border-[#E5E5E5] rounded-lg text-xs outline-none focus:border-[#303030]"
                          />
                          <input
                            type="text"
                            placeholder="Модель"
                            defaultValue={v.model}
                            className="flex-1 h-[34px] px-3 border border-[#E5E5E5] rounded-lg text-xs outline-none focus:border-[#303030]"
                          />
                          <input
                            type="text"
                            placeholder="Год"
                            defaultValue={v.year}
                            className="w-[70px] h-[34px] px-3 border border-[#E5E5E5] rounded-lg text-xs outline-none focus:border-[#303030]"
                          />
                          <input
                            type="text"
                            placeholder="Гос. номер"
                            defaultValue={v.licensePlate}
                            className="w-[120px] h-[34px] px-3 border border-[#E5E5E5] rounded-lg text-xs outline-none focus:border-[#303030]"
                          />
                          <button
                            onClick={() => removeVehicle(cls.id, v.id)}
                            className="p-1 text-[#A1A1A1] hover:text-[#FA6868] transition-colors"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <Button>Сохранить</Button>
      </div>
    </div>
  );
}
