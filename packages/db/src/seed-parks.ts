import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { carBrands } from "./schema/car-brands";
import { carModels } from "./schema/car-models";
import { taxiParks } from "./schema/taxi-parks";
import { parkClasses } from "./schema/park-classes";
import { parkVehicles } from "./schema/park-vehicles";

const BRANDS_MODELS = [
  { name: "Kia", models: ["Rio", "K5", "Optima", "Ceed"] },
  { name: "Hyundai", models: ["Solaris", "Elantra", "Sonata", "Creta"] },
  { name: "Toyota", models: ["Camry", "Corolla", "RAV4", "Land Cruiser"] },
  { name: "Skoda", models: ["Rapid", "Octavia", "Superb"] },
  { name: "Volkswagen", models: ["Polo", "Jetta", "Passat", "Tiguan"] },
  { name: "Renault", models: ["Logan", "Duster", "Arkana"] },
  { name: "Mercedes-Benz", models: ["E-class", "S-class", "GLE"] },
  { name: "BMW", models: ["3 Series", "5 Series", "7 Series", "X5"] },
];

const PARKS_DATA = [
  { name: "Шоколад", address: "Москва, ул. Складочная, 3", phone: "+74951234501", district: "CAO" as const, isAdvertised: true, isSuperAdvertised: true },
  { name: "Метеор", address: "Москва, Электрозаводская, 21", phone: "+74951234502", district: "VAO" as const, isAdvertised: true, isSuperAdvertised: false },
  { name: "Гермес", address: "Москва, Варшавское ш., 125", phone: "+74951234503", district: "UAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Премиум Такси", address: "Москва, Ленинградский пр., 80", phone: "+74951234504", district: "SAO" as const, isAdvertised: true, isSuperAdvertised: false },
  { name: "Авто-Партнёр", address: "Москва, Алтуфьевское ш., 43", phone: "+74951234505", district: "SVAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Бумеранг", address: "Москва, Рублёвское ш., 20", phone: "+74951234506", district: "ZAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Молния", address: "Москва, Каширское ш., 51", phone: "+74951234507", district: "UAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Стрела", address: "Москва, Новокосино, 13", phone: "+74951234508", district: "VAO" as const, isAdvertised: true, isSuperAdvertised: false },
  { name: "Лидер", address: "Мытищи, Олимпийский пр., 10", phone: "+74951234509", district: "MYTISCHI" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Экспресс", address: "Химки, ул. Молодёжная, 8", phone: "+74951234510", district: "KHIMKI" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Столица", address: "Москва, Марьино, 45", phone: "+74951234511", district: "UVAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Бизнес-Класс", address: "Москва, Пресненская наб., 12", phone: "+74951234512", district: "CAO" as const, isAdvertised: true, isSuperAdvertised: false },
  { name: "Драйв", address: "Балашиха, Советская, 15", phone: "+74951234513", district: "BALASHIKHA" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Надёжный", address: "Москва, Профсоюзная, 123", phone: "+74951234514", district: "UZAO" as const, isAdvertised: false, isSuperAdvertised: false },
  { name: "Форсаж", address: "Москва, Щёлковское ш., 88", phone: "+74951234515", district: "VAO" as const, isAdvertised: false, isSuperAdvertised: false },
];

const CLASSES = ["ECONOMY", "COMFORT", "COMFORT_PLUS", "BUSINESS"] as const;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return +(Math.random() * (max - min) + min).toFixed(decimals);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Seeding brands & models...");
  const brandIdMap = new Map<string, string>();
  const modelIdMap = new Map<string, string>(); // "Brand:Model" -> id

  for (const b of BRANDS_MODELS) {
    const [existingBrand] = await db.select().from(carBrands).where(eq(carBrands.name, b.name)).limit(1);
    let brandId: string;
    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const [created] = await db.insert(carBrands).values({ name: b.name }).returning();
      brandId = created.id;
    }
    brandIdMap.set(b.name, brandId);

    for (const modelName of b.models) {
      const [existing] = await db.select().from(carModels)
        .where(eq(carModels.name, modelName))
        .limit(1);
      let modelId: string;
      if (existing && existing.brandId === brandId) {
        modelId = existing.id;
      } else {
        const [created] = await db.insert(carModels).values({ brandId, name: modelName }).returning();
        modelId = created.id;
      }
      modelIdMap.set(`${b.name}:${modelName}`, modelId);
    }
  }

  console.log("Seeding parks...");
  let totalClasses = 0;
  let totalVehicles = 0;

  for (const parkData of PARKS_DATA) {
    // Check if park already exists
    const [existing] = await db.select().from(taxiParks).where(eq(taxiParks.name, parkData.name)).limit(1);
    if (existing) {
      console.log(`  Skipping existing park: ${parkData.name}`);
      continue;
    }

    const [park] = await db.insert(taxiParks).values({
      name: parkData.name,
      address: parkData.address,
      phone: parkData.phone,
      city: "moscow",
      district: parkData.district,
      isAdvertised: parkData.isAdvertised,
      isSuperAdvertised: parkData.isSuperAdvertised,
      sources: ["seed"],
      status: "ACTIVE",
    }).returning();

    // Create 2-3 classes per park
    const classCount = rand(2, 3);
    const selectedClasses = [...CLASSES].sort(() => Math.random() - 0.5).slice(0, classCount);

    for (const driverClass of selectedClasses) {
      const [cls] = await db.insert(parkClasses).values({
        parkId: park.id,
        driverClass,
        parkCommission: String(randFloat(3, 8)),
        withdrawalCommission: String(randFloat(0, 3)),
        transferCommission: String(randFloat(0, 5)),
        deposit: rand(5000, 30000),
        depositReturnDays: rand(0, 14),
        latePenalty: rand(0, 2000),
        trafficFinePenalty: rand(0, 100),
        terminationDays: rand(1, 14),
        contractFairness: rand(2, 5),
        contractMatch: rand(2, 5),
        daysOff: rand(1, 5),
        newDriverPromoDays: String(randFloat(0, 6, 1)),
        maxPromoDaysInClass: "6.0",
        replacementCar: rand(1, 5),
        insurance: rand(1, 5),
        inspectionFreq: rand(1, 5),
        maintenanceDay: rand(1, 5),
        extraScratch: rand(1, 5),
        repairDowntime: rand(1, 6),
        selfRepair: rand(1, 3),
        repairPricing: rand(1, 3),
        hasAvailableCars: true,
      }).returning();
      totalClasses++;

      // Create 2-4 vehicles per class
      const vehicleCount = rand(2, 4);
      for (let i = 0; i < vehicleCount; i++) {
        const brand = pick(BRANDS_MODELS);
        const modelName = pick(brand.models);
        const brandId = brandIdMap.get(brand.name)!;
        const modelId = modelIdMap.get(`${brand.name}:${modelName}`)!;

        let priceRange: [number, number];
        switch (driverClass) {
          case "ECONOMY": priceRange = [1800, 2800]; break;
          case "COMFORT": priceRange = [2500, 3800]; break;
          case "COMFORT_PLUS": priceRange = [3200, 4500]; break;
          case "BUSINESS": priceRange = [4500, 7000]; break;
          default: priceRange = [2000, 3000];
        }

        await db.insert(parkVehicles).values({
          classId: cls.id,
          brandId,
          modelId,
          year: rand(2019, 2024),
          rentPrice: rand(priceRange[0], priceRange[1]),
          isAvailable: Math.random() > 0.1, // 90% available
        });
        totalVehicles++;
      }
    }
    console.log(`  ✓ ${parkData.name} (${classCount} classes)`);
  }

  console.log(`\nDone. Parks: ${PARKS_DATA.length}, Classes: ${totalClasses}, Vehicles: ${totalVehicles}`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
