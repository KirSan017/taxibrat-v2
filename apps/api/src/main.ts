import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Документы и фото идут в виде base64 dataURL (~5MB на фото после кодировки).
  // Дефолтный body parser обрезает на ~100kb.
  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });

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
