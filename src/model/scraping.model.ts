// Complete media item structure for movies, TV shows, or episodes
export class MediaItemDto {
    post_title: string;
    post_content: string;
    post_name: string;
    post_type: string;
    post_status: string;
    IDMUVICORE: IdmuvicoreDto[];
    taxonomy: TaxonomyDto;
}


// Core movie properties DTO
export class IdmuvicoreDto {
    IDMUVICORE_Title: string;
    IDMUVICORE_Trailer: string;
    IDMUVICORE_Poster: string;
    IDMUVICORE_tmdbVotes: string;
    IDMUVICORE_tmdbRating: string;
    IDMUVICORE_Released: string;
    IDMUVICORE_Runtime: string;
    IDMUVICORE_Year: string;
    IDMUVICORE_Language: string;
    _yoast_wpseo_focuskw: string;

    IDMUVICORE_Player1?: string;
    IDMUVICORE_Player2?: string;
    IDMUVICORE_Player3?: string;
    IDMUVICORE_Player4?: string;
    IDMUVICORE_Player5?: string;
    IDMUVICORE_Player6?: string;

    // For episodes
    IDMUVICORE_Title_Episode?: string;
    IDMUVICORE_Episodenumber?: string;
    IDMUVICORE_Sessionnumber?: string;

    // For download links (dynamic properties)
    [key: string]: string | undefined;
}

// Category data structure
export class CategoryDto {
    name: string;
    slug: string;
}

export class TaxonomyDto {
    muviyear?: CategoryDto[];
    muviquality?: CategoryDto[];
    muvicountry?: CategoryDto[];
    category?: { [key: number]: CategoryDto[] };
}