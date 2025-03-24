import { Controller, Get } from '@nestjs/common';
import { DutamovieService } from './dutamovie.service';
import { MediaItemDto } from '../model/scraping.model';

@Controller('dutamovie')
export class DutamovieController {
  constructor(private readonly dutamovieService: DutamovieService) { }

  @Get('posts')
  async getPosts(): Promise<MediaItemDto[]> {
    return this.dutamovieService.getPosts();
  }

  @Get('anime')
  async getAnime(): Promise<MediaItemDto[]> {
    return this.dutamovieService.getAnime();
  }


}
