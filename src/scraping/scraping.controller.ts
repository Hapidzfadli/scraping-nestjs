import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { MediaItemDto } from '../model/scraping.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
@Controller('scraping')
export class ScrapingController {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        private readonly scrapingService: ScrapingService) { }

    @Get('post')
    async getPost(): Promise<MediaItemDto[]> {
        return await this.scrapingService.getPost();
    }

    @Get('tv-shows')
    async getTvShows(): Promise<MediaItemDto[]> {
        return await this.scrapingService.getTvShows();
    }

    @Get('episodes')
    async getEpisodes(): Promise<MediaItemDto[]> {
        return await this.scrapingService.getEpisodes();
    }

    @Get('movies')
    async getMovies(@Query('url') url: string): Promise<MediaItemDto[]> {
        const decodedUrl = decodeURIComponent(url);
        const queryString = decodedUrl.split('?')[1];
        const params = new URLSearchParams(queryString);
        const postType = params.get('post_type') ?? '';

        this.logger.info({ message: 'URL', data: decodedUrl });

        return await this.scrapingService.getWithSeach(decodedUrl, postType);
    }
}

