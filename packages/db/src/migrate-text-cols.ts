import "dotenv/config";
import postgres from "postgres";

/**
 * Одноразовая миграция: photo_url + 5 document URL колонок
 * varchar(500) → text. base64 dataURL изображений в среднем 1-5MB, в 500
 * символов не лезут. Запуск (с .env содержащим DATABASE_URL):
 *   pnpm --filter "@taxibrat/db" exec tsx src/migrate-text-cols.ts
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1, prepare: false });
  const cols = [
    "photo_url",
    "license_front_url",
    "license_back_url",
    "face_with_license_url",
    "sts_front_url",
    "sts_back_url",
  ];

  for (const col of cols) {
    console.log(`ALTER users.${col} -> text`);
    await client.unsafe(
      `ALTER TABLE "users" ALTER COLUMN "${col}" TYPE text USING "${col}"::text`
    );
  }

  console.log("Done.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
