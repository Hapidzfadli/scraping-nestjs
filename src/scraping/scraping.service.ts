import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MediaItemDto } from '../model/scraping.model';
import { elementAt, firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { index } from 'cheerio/dist/commonjs/api/traversing';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScrapingService {
    private readonly site: string;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
        private readonly httpService: HttpService,
        private configService: ConfigService
    ) {
        this.site = this.configService.get<string>('SITE_URL') ?? 'https://new10.ngefilm.site/';
    }

    async getPost(): Promise<MediaItemDto[]> {
        return this.getPageData(this.site + '?s=&search=advanced&post_type=movie', 'post');
    }

    async getTvShows(): Promise<MediaItemDto[]> {
        return this.getPageData(this.site + 'tv', 'tv');
    }

    async getEpisodes(): Promise<MediaItemDto[]> {
        return this.getPageData(this.site + 'eps', 'episode');
    }

    async getWithSeach(url: string, type: string) {
        return this.getPageData(url, type)
    }

    private async getPageData(url: string, type: string): Promise<MediaItemDto[]> {
        this.logger.info(`Scraping ${type} from ${url}`);

        try {

            const response = await firstValueFrom(this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
            }));


            const $ = cheerio.load(response.data);
            const articles = $('article.item-infinite');

            this.logger.info(`Found ${articles.length} articles`);

            const urls: string[] = [];

            articles.each((_, article) => {
                const watchButton = $(article).find('a.button.gmr-watch-button');
                if (watchButton.length) {
                    const href = watchButton.attr('href');
                    if (href) {
                        urls.push(href);
                    }
                }
            });

            const result = await Promise.all(
                urls.map(async (url) => this.getHtmlData(url, type))
            )

            return result;
        } catch (error) {
            this.logger.error(`Error scraping ${type} from ${url}: ${error.message}`);
            return [];
        }
    }

    private async getHtmlData(url: string, type: string): Promise<MediaItemDto> {
        try {
            const response = await firstValueFrom(this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
            }));



            const $ = cheerio.load(response.data);
            const post_title = $('h1.entry-title').text();
            const post_content = $('div.entry-content.entry-content-single p').first().text();

            const trailerUrl = $('a.gmr-trailer-popup').attr('href') || 'xxx';
            const posterUrl = $('img.attachment-thumbnail').attr('src')?.replace('-60x90', '');

            const mediaItem: MediaItemDto = {
                post_title: post_title,
                post_content: post_content,
                post_name: post_title.replace(/\s+/g, '-').toLowerCase(),
                post_type: type,
                post_status: 'publish',
                IDMUVICORE: [{
                    IDMUVICORE_Title: post_title ?? '',
                    IDMUVICORE_Trailer: trailerUrl.replace('https://www.youtube.com/watch?v=', ''),
                    IDMUVICORE_Poster: posterUrl ?? '',
                    IDMUVICORE_tmdbVotes: $('span[itemprop="ratingCount"]').text(),
                    IDMUVICORE_tmdbRating: $('span[itemprop="ratingValue"]').text().replace(',', '.'),
                    IDMUVICORE_Released: $('time[itemprop="dateCreated"]').text(),
                    IDMUVICORE_Runtime: $('span[property="duration"]').text().replace('Min', ''),
                    IDMUVICORE_Year: '',
                    IDMUVICORE_Language: $('span[property="inLanguage"]').text(),
                    _yoast_wpseo_focuskw: `Nonton Film ${post_title} sub Indo`
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
            this.logger.error(`Error processing HTML from ${url}: ${error.message}`);
            return new MediaItemDto()
        }
    }

    private proceessMovieData($: any, mediaItem: MediaItemDto): void {
        const taxonomy: any = {};
        const movieData = $('div.gmr-moviedata');

        movieData.each((index, element) => {
            const category = $(element).find('strong').text().trim();

            if (category === 'Tahun:' || category === 'Year:') {
                const year = $(element).find('a').text().trim();
                taxonomy.muviyear = [{ name: year, slug: year.toLowerCase() }];
                mediaItem.IDMUVICORE[0].IDMUVICORE_Year = year;

            } else if (category === 'Kualitas:' || category === 'Quality:') {
                const quality = $(element).find('a').text().trim();
                taxonomy.muviquality = [{ name: quality, slug: quality.toLowerCase() }];

            } else if (category === 'Negara:' || category === 'Country:') {
                const countries = $(element).find('a');

                taxonomy.muvicountry = [];

                countries.each((_, el) => {
                    const name = $(el).text().trim();
                    taxonomy.muvicountry.push({
                        name,
                        slug: name.toLowerCase().replace(/\s+/g, '-')
                    });
                });
            } else if (category === 'Genre:') {
                const genres = $(element).find('a');
                taxonomy.category = [];

                genres.each((_, genre) => {
                    const genreName = $(genre).text().trim();
                    taxonomy.category.push({
                        name: genreName,
                        slug: genreName.toLowerCase().replace(/\s+/g, '-')
                    });
                });
            } else if (category === 'Director:' || category === 'Direksi:') {
                const director = $(element).find('a');
                taxonomy.muvidirector = [];

                director.each((_, el) => {
                    const name = $(el).text().trim();
                    taxonomy.muvidirector.push({
                        name,
                        slug: name.toLowerCase().replace(/\s+/g, '-')
                    });
                });
            } else if (category === 'Cast:' || category === 'Pemain:') {
                const cast = $(element).find('a');
                taxonomy.muvicast = [];

                cast.each((_, el) => {
                    const name = $(el).text().trim();
                    taxonomy.muvicast.push({
                        name,
                        slug: name.toLowerCase().replace(/\s+/g, '-')
                    });
                });
            }
        });

        const tag_string = `kios film 21, indoxx1, cinemaindo, nonton film indonesia, filmapik, ngefilm21, lk21, nonton film lk21, nonton ${mediaItem.post_title} lk21, gudangmovies21, download film indonesia terbaru lk21, download film sub indo, nonton film ${mediaItem.post_title}, nonton film gratis, layarkaca21, streaming film ${mediaItem.post_title}, ganool`;

        const postTags = tag_string
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        taxonomy.post_tag = [];

        postTags.forEach(tag => {
            taxonomy.post_tag.push({
                name: tag,
                slug: tag.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
            });
        })

        mediaItem.taxonomy = taxonomy;
    }



    private processPlayerData($: any, mediaItem: MediaItemDto): void {

        mediaItem.IDMUVICORE[0].IDMUVICORE_Player1 = `<iframe width="640" height="360" src="${$('div.gmr-embed-responsive').find('iframe').attr('src')}" scrolling="no" frameborder="0" allowfullscreen></iframe>`;
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