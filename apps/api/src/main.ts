import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Документы и фото идут в виде base64 dataURL (~5MB на фото после кодировки).
  // Дефолтный 100kb express body parser не пускает.
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ limit: "10mb", extended: true }));

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = app.get(ConfigService<EnvConfig>);
  const port = config.get("API_PORT", { infer: true })!;

  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
