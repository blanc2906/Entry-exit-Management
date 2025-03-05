import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.useStaticAssets(join(process.cwd(), 'temporary'), {
    prefix: '/temporary',
  });

  const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('My API description')
  .setVersion('1.0')
  .addTag('api')
  .build();
  const documentFactory = () => SwaggerModule.createDocument(app,config);
  
  try {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: configService.get('MQTT_URL'),
        username: configService.get('MQTT_USERNAME'),
        password: configService.get('MQTT_PASSWORD'),
        rejectUnauthorized: false,
      },
    });
    await app.startAllMicroservices();
  } catch (error) {
    console.error('Error starting microservice:', error);
  }

  SwaggerModule.setup('api',app, documentFactory);
  await app.listen(3000);
}
bootstrap();