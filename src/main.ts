import { NestFactory } from '@nestjs/core';
import { loadEnvFile } from './config/load-env';
import { AppModule } from './app.module';

async function bootstrap() {
  loadEnvFile();

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
