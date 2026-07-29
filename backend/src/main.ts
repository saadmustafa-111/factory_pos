import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests only from localhost origins (Electron renderer uses null origin
  // when loading from file://, so we allow that too)
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // No origin = same-origin or Electron file:// renderer (reports as null)
      if (!origin || origin === 'null') return callback(null, true);
      // Allow any localhost port (dev server, etc.)
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin))
        return callback(null, true);
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
        return callback(null, true);
      callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Allow large payloads for base64 image uploads
  (app as any).use(require('express').json({ limit: '10mb' }));
  (app as any).use(
    require('express').urlencoded({ extended: true, limit: '10mb' }),
  );

  // Health check endpoint for Electron startup probe
  (app as any).use('/health', (_req: any, res: any) => res.json({ ok: true }));

  // Bind to localhost only — prevents access from other machines on the LAN
  await app.listen(6101, '127.0.0.1');
}

bootstrap();
