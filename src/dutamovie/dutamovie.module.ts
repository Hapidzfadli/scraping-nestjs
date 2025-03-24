import { Module } from '@nestjs/common';
import { DutamovieService } from './dutamovie.service';
import { DutamovieController } from './dutamovie.controller';
import { HttpModule } from '@nestjs/axios';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 100,
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf((info) => {
              const { timestamp, level, message, context, ...args } = info;
              return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
            }),
          ),
        }),
        // Add file transport for logging to a file
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
      ],
    }),
  ],
  controllers: [DutamovieController],
  providers: [DutamovieService],
})
export class DutamovieModule { }
