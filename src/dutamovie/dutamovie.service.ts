import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MediaItemDto } from '../model/scraping.model';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
@Injectable()
export class DutamovieService {
    private site: string;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.site = this.configService.get('DUTAMOVIE_SITE') ?? 'https://asia.dutamovie21.work/';
    }


    async getPosts(): Promise<MediaItemDto[]> {
        return this.getPageData(this.site + '?s=&search=advanced&post_type=movie', 'post');
    }

    async getAnime(): Promise<MediaItemDto[]> {
        return this.getPageData(this.site + 'category/animasi/', 'post');
    }


    async getPageData(url: string, type: string): Promise<MediaItemDto[]> {
        try {
            const response = await firstValueFrom(this.httpService.get(url, {
                httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
            }));

            const $ = cheerio.load(response.data);
            const articles = $('article.item-infinite');

            const urls: string[] = [];
            articles.each((_, article) => {
                const watchButton = $(article).find('a.button.gmr-watch-button');
                if (watchButton.length) {
                    const href = watchButton.attr('href');
                    if (href) {
                        urls.push(href);
                    }
                }
            })

            const result = await Promise.all(
                urls.map(async (url) => this.getHtmlData(url, type))
            )

            return result;
        } catch (error) {
            this.logger.error(`Error scraping ${type} from ${url}`, error);
            return [];
        }
    }

    private async getHtmlData(url: string, type: string): Promise<MediaItemDto> {
        try {
            const response = await firstValueFrom(this.httpService.get(url, {
                httpAgent: new (require('http')).Agent({ rejectUnauthorized: false }),
            }))

            const $ = cheerio.load(response.data);
            const title = $('h1.entry-title').text().trim();
            const content = $('div.entry-content.entry-content-single p').first().text().trim();
            const trailerUrl = $('a.gmr-trailer-popup').attr('href') || '';
            const posterUrl = $('img.attachment-thumbnail').attr('src')?.replace('-60x90', '');

            const mediaItem: MediaItemDto = {
                post_title: title,
                post_content: content,
                post_name: title.replace(/\s+/g, '-').toLowerCase(),
                post_type: type,
                post_status: 'publish',
                IDMUVICORE: [{
                    IDMUVICORE_Title: title ?? '',
                    IDMUVICORE_Trailer: trailerUrl.replace('http://www.youtube.com/watch?v=', ''),
                    IDMUVICORE_Poster: posterUrl ?? '',
                    IDMUVICORE_tmdbVotes: $('span[itemprop="ratingCount"]').text(),
                    IDMUVICORE_tmdbRating: $('span[itemprop="ratingValue"]').text().replace(',', '.'),
                    IDMUVICORE_Released: $('time[itemprop="dateCreated"]').text(),
                    IDMUVICORE_Runtime: $('span[property="duration"]').text(),
                    IDMUVICORE_Year: '',
                    IDMUVICORE_Language: $('span[property="inLanguage"]').text(),
                    _yoast_wpseo_focuskw: `Nonton Film ${title} sub Indo`
                }],

                taxonomy: {}
            }

            this.proceessMovieData($, mediaItem);


            if (type !== 'tv') {
                this.processPlayerData($, mediaItem);
                this.processDownloadLinks($, mediaItem);
            }

            if (type === 'episode') {
                this.processEpisodeData($, mediaItem);
            }

            return mediaItem;
        } catch (error) {
            this.logger.error(`Error scraping ${type} from ${url}`, error);
            return new MediaItemDto();
        }
    }

    private proceessMovieData($: any, mediaItem: MediaItemDto): void {
        const taxonomy: any = {};
        const movieData = $('div.gmr-moviedata')

        movieData.each((index, element) => {
            const category = $(element).find('strong').text().trim() || '';
            if (category === 'Tahun:') {
                const year = $(element).find('a').text().trim() || '';
                taxonomy.muviyear = [{ name: year, slug: year.toLowerCase() }];
                mediaItem.IDMUVICORE[0].IDMUVICORE_Year = year;
            } else if (category === 'Kualitas:') {
                const quality = $(element).find('a').text();
                taxonomy.muviquality = [{ name: quality, slug: quality.toLowerCase() }]
            } else if (category === 'Negara:') {
                const country = $(element).find('a').text();
                taxonomy.muvicountry = [{ name: country, slug: country.toLowerCase() }]
            } else if (category === 'Genre:') {
                const genres = $(element).find('a');
                taxonomy.category = {};
                genres.each((index, genre) => {
                    const genreName = $(genre).text();
                    taxonomy.category[index] = [{ name: genreName, slug: genreName.toLowerCase() }]
                });
            }
        });



        mediaItem.taxonomy = taxonomy;
    }


    private processPlayerData($: any, mediaItem: MediaItemDto): void {
        mediaItem.IDMUVICORE[0].IDMUVICORE_Player1 = $('div.gmr-embed-responsive').find('iframe').attr('src');
        mediaItem.IDMUVICORE[0].IDMUVICORE_Player2 = '<iframe width="640" height="360" src="https://hxfile.co/embed-xxxxxx.html" scrolling="no" frameborder="0" allowfullscreen></iframe>';
        mediaItem.IDMUVICORE[0].IDMUVICORE_Player3 = '<iframe width="640" height="360" src="https://gettapeads.com/e/xxxxxxxxxxx" scrolling="no" frameborder="0" allowfullscreen></iframe>';
        mediaItem.IDMUVICORE[0].IDMUVICORE_Player4 = '<iframe width="640" height="360" src="https://krakenfiles.com/embed-video/xxxxxxxxx" scrolling="no" frameborder="0" allowfullscreen></iframe>';
    }

    private processDownloadLinks($: any, mediaItem: MediaItemDto): void {
        const downloadLinks = $('ul.gmr-download-list a');

        downloadLinks.each((index, link) => {
            const linkNum = index + 1;
            const titleKey = `IDMUVICORE_Title_Download${linkNum}`;
            const linkKey = `IDMUVICORE_Download${linkNum}`;

            mediaItem.IDMUVICORE[0][titleKey] = $(link).text();
            mediaItem.IDMUVICORE[0][linkKey] = $(link).attr('href');
        });
    }

    private processEpisodeData($: any, mediaItem: MediaItemDto): void {
        const episodeTitle = $('h1.entry-title[itemprop="name"]').text();
        mediaItem.IDMUVICORE[0].IDMUVICORE_Title_Episode = episodeTitle;

        // Extract all digits from the title
        const digits = episodeTitle.replace(/\D/g, '');
        const hasSeason2 = episodeTitle.includes('S2');

        if (hasSeason2 && digits.length >= 2) {
            mediaItem.IDMUVICORE[0].IDMUVICORE_Episodenumber = digits.slice(-2);
            mediaItem.IDMUVICORE[0].IDMUVICORE_Sessionnumber = digits[0];
        } else {
            mediaItem.IDMUVICORE[0].IDMUVICORE_Episodenumber = digits;
            mediaItem.IDMUVICORE[0].IDMUVICORE_Sessionnumber = '1';
        }
    }


}
