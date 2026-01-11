/**
 * TypeScript interfaces for JioSaavn API responses
 */

export interface Image {
  quality: '50x50' | '150x150' | '500x500' | '1000x1000';
  link: string;
}

export interface DownloadUrl {
  quality: '12kbps' | '48kbps' | '96kbps' | '160kbps' | '320kbps';
  link: string;
}

export interface Artist {
  id: string;
  name: string;
  url: string;
  image?: Image[];
  followerCount?: number;
  fanCount?: number;
  isVerified?: boolean;
  dominantLanguage?: string;
  dominantType?: string;
}

export interface Album {
  id: string;
  name: string;
  url: string;
  image?: Image[];
  songCount?: number;
  language?: string;
  year?: number;
  releaseDate?: string;
  primaryArtists?: Artist[];
  artists?: Artist[];
}

export interface Song {
  id: string;
  name: string;
  duration: number; // in seconds
  album: Album;
  year?: number;
  releaseDate?: string;
  label?: string;
  primaryArtists?: string;
  primaryArtistsId?: string;
  featuredArtists?: string;
  featuredArtistsId?: string;
  explicitContent?: number;
  playCount?: number;
  language?: string;
  hasLyrics?: string; // 'true' | 'false'
  lyrics?: string;
  lyricsId?: string;
  copyright?: string;
  artists: Artist[];
  image: Image[];
  downloadUrl?: DownloadUrl[];
  url: string;
  encryptedMediaUrl?: string;
  encryptedMediaPath?: string;
  mediaPreviewUrl?: string;
  permaUrl?: string;
  albumId?: string;
  albumUrl?: string;
  albumName?: string;
}

export interface SongDetailsResponse {
  status: string;
  message?: string;
  data: Song[];
}

export interface SearchResponse {
  status: string;
  message?: string;
  data: {
    total: number;
    start: number;
    results: Song[];
  };
}

export interface ArtistDetailsResponse {
  status: string;
  message?: string;
  data: Artist[];
}

export interface ArtistSongsResponse {
  status: string;
  message?: string;
  data: Song[];
}

export interface SuggestionsResponse {
  status: string;
  message?: string;
  data: Song[];
}

export interface ApiError {
  status: string;
  message: string;
  error?: any;
}

