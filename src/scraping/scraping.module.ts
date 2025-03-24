import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        HttpModule.register({
            timeout: 60000,
            maxRedirects: 5,
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
            ],
        }),

    ],
    controllers: [ScrapingController],
    providers: [ScrapingService],
})
export class ScrapingModule { }