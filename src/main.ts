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
  // Setear prefijo global para las rutas de la API
  app.setGlobalPrefix(globalPrefix);
  // Configurar Swagger para la documentación de la API
  const config = new DocumentBuilder()
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token (without Bearer prefix)',
        in: 'header',
      },
      'JWT-auth',
    )
    .setTitle('Take home API')
    .setVersion('1.0')
    .addTag('App', 'Información general de la aplicación')
    .addTag('Jobs', 'Gestión de trabajos')
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
      customSiteTitle: 'Homa Take API - Swagger',
      customfavIcon: '/favicon.ico',
    });
  }
  // Habilitar CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
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
    Logger.log('Listening at http://localhost:' + port + '/' + globalPrefix);
    environmentData !== environment.production &&
      Logger.log('Documentation in http://localhost:' + port + '/' + 'docs');
  });
}
void bootstrap();
