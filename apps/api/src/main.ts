import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { EnvConfig } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
