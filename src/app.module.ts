import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapingModule } from './scraping/scraping.module';
import { ConfigModule } from '@nestjs/config';
import { DutamovieModule } from './dutamovie/dutamovie.module';

@Module({
    imports: [ScrapingModule, ConfigModule.forRoot({
        isGlobal: true,
    }), DutamovieModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
