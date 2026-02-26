// Archivo principal de la aplicación NestJS
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// Importar el módulo principal de la aplicación
import { AppModule } from './app.module';
import { loggerOptions } from './utils/';
import { environment } from './enums/env.enum';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // Configuración de Winston para el logger
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(
      loggerOptions(process.env.APPLICATION_NAME || 'app'),
    ),
  });
  // Obtener configuración desde ConfigService
  const configService = app.get(ConfigService);
  const environmentData = configService.get<string>('NODE_ENV');
  const port = configService.get<number>('PORT') || 3000;
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX') || 'api';
  // Setear prefijo global para las rutas de la
  // API (ej: /api/v1)
  app.setGlobalPrefix(globalPrefix);

  // Register global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  // Configurar Swagger para la documentación de la API
  const config = new DocumentBuilder()
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        name: 'Authorization',
        description: 'Enter your API key (pk_xxxxx)',
        in: 'header',
      },
      'api-key',
    )
    .setTitle('VibePeak Image Processing API')
    .setVersion('1.0')
    .setDescription('Public REST API Gateway for async image processing')
    .addTag('App', 'Application health check')
    .addTag('Jobs', 'Image processing job management')
    .build();
  // Crear el documento de Swagger y configurar la ruta para la documentación
  const document = SwaggerModule.createDocument(app, config);
  if (environmentData !== environment.production) {
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        defaultModelsExpandDepth: -1,
        docExpansion: 'none',
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
      customSiteTitle: 'VibePeak API - Swagger',
      customfavIcon: '/favicon.ico',
    });
  }
  // Habilitar CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    preflightContinue: false,
    credentials: true,
  });
  //  Configurar validación global para las solicitudes entrantes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Unicamente permite las propiedades definidas en los DTOs
      forbidNonWhitelisted: true, // Rechaza solicitudes con propiedades no definidas en los DTOs
    }),
  );
  // Arrancar la aplicación
  await app.listen(port, () => {
    Logger.log(
      'Listening at http://localhost:' + port + '/' + globalPrefix + '/v1/',
    );
    if (environmentData !== environment.production) {
      Logger.log('Documentation in http://localhost:' + port + '/' + 'docs');
    }
  });
}
void bootstrap();
