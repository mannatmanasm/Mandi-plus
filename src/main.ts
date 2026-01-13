import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging in production
  });
  const configService = app.get(ConfigService);

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isDevelopment = nodeEnv === 'development';

  // Swagger documentation - ONLY IN DEVELOPMENT
  if (isDevelopment) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Mandi Plus API')
      .setDescription('API for Mandi Plus')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // CORS SETUP
  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const defaultDevOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  const finalOrigins = isDevelopment
    ? [...defaultDevOrigins, ...allowedOrigins]
    : allowedOrigins.length > 0
      ? allowedOrigins
      : ['*'];

  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      if (isDevelopment) {
        const isLocalhost =
          origin.includes('localhost') || origin.includes('127.0.0.1');
        if (isLocalhost) {
          return callback(null, true);
        }
      }

      if (finalOrigins.includes('*')) {
        return callback(null, true);
      }

      if (finalOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Request-ID',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.enableCors(corsOptions);

  const port = configService.get<number>('PORT') || 3005;
  await app.listen(port);

  console.log(`Application is running on port ${port}`);
}
bootstrap();
