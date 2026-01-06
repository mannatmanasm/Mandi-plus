import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mandi Plus API')
    .setDescription('API for Mandi Plus')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  //  CORS SETUP

  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isDevelopment = nodeEnv === 'development';

  // Get allowed origins from environment
  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // Default origins for development
  const defaultDevOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  // Determine final allowed origins
  const finalOrigins = isDevelopment
    ? [...defaultDevOrigins, ...allowedOrigins]
    : allowedOrigins.length > 0
      ? allowedOrigins
      : ['*']; // Fallback to all origins if not configured (not recommended for production)

  // CORS configuration
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // In development, allow all localhost origins
      if (isDevelopment) {
        const isLocalhost =
          origin.includes('localhost') || origin.includes('127.0.0.1');
        if (isLocalhost) {
          return callback(null, true);
        }
      }

      // Check if origin is in allowed list
      if (finalOrigins.includes('*')) {
        return callback(null, true);
      }

      if (finalOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject origin
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
    credentials: true, // Important: Enable credentials for cookies/auth
    maxAge: 86400, // 24 hours - cache preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.enableCors(corsOptions);

  // Global prefix (optional - uncomment if needed)
  // app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT') || 3005;
  await app.listen(port);
}
bootstrap();
