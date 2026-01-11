import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Song,
  Album,
  Artist,
  SearchResponse,
  SongDetailsResponse,
  ArtistDetailsResponse,
  ArtistSongsResponse,
  SuggestionsResponse,
  Image,
  DownloadUrl,
  ApiError,
} from '../types/api';
import { API_BASE_URL, API_ENDPOINTS, API_TIMEOUT } from '../constants/api';

/**
 * Axios instance configured with base URL
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Transform API image array to standardized format
 */
const transformImages = (images: any[] | undefined): Image[] => {
  if (!images || !Array.isArray(images)) return [];
  return images.map((img) => ({
    quality: img.quality || '500x500',
    link: img.url || img.link || '',
  }));
};

/**
 * Transform API download URLs to standardized format
 */
const transformDownloadUrls = (downloadUrls: any[] | undefined): DownloadUrl[] => {
  if (!downloadUrls || !Array.isArray(downloadUrls)) return [];
  return downloadUrls.map((url) => ({
    quality: url.quality || '160kbps',
    link: url.url || url.link || '',
  }));
};

/**
 * Transform API artist data to standardized format
 */
const transformArtists = (artists: any[] | undefined): Artist[] => {
  if (!artists || !Array.isArray(artists)) return [];
  return artists.map((artist) => ({
    id: artist.id || '',
    name: artist.name || '',
    url: artist.url || artist.perma_url || '',
    image: transformImages(artist.image || artist.image_url),
    followerCount: artist.follower_count || artist.followerCount,
    fanCount: artist.fan_count || artist.fanCount,
    isVerified: artist.isVerified || false,
    dominantLanguage: artist.dominant_language || artist.dominantLanguage,
    dominantType: artist.dominant_type || artist.dominantType,
  }));
};

/**
 * Transform API album data to standardized format
 */
const transformAlbum = (album: any): Album => {
  if (!album) {
    return {
      id: '',
      name: 'Unknown Album',
      url: '',
      image: [],
    };
  }

  return {
    id: album.id || '',
    name: album.name || album.title || 'Unknown Album',
    url: album.url || album.perma_url || '',
    image: transformImages(album.image || album.image_url),
    songCount: album.song_count || album.songCount,
    language: album.language || album.language,
    year: album.year || album.release_date ? new Date(album.release_date).getFullYear() : undefined,
    releaseDate: album.release_date || album.releaseDate,
    primaryArtists: album.primary_artists ? transformArtists(Array.isArray(album.primary_artists) ? album.primary_artists : [album.primary_artists]) : undefined,
    artists: transformArtists(album.artists),
  };
};

/**
 * Transform API song data to standardized format
 */
const transformSong = (song: any): Song => {
  if (!song) {
    throw new Error('Invalid song data');
  }

  return {
    id: song.id || '',
    name: song.title || song.name || song.song || '',
    duration: song.duration ? parseInt(song.duration, 10) : 0,
    album: transformAlbum(song.album || song.album_data),
    year: song.year || (song.release_date ? new Date(song.release_date).getFullYear() : undefined),
    releaseDate: song.release_date || song.releaseDate,
    label: song.label || song.subtitle,
    primaryArtists: song.primary_artists || song.primaryArtists,
    primaryArtistsId: song.primary_artists_id || song.primaryArtistsId,
    featuredArtists: song.featured_artists || song.featuredArtists,
    featuredArtistsId: song.featured_artists_id || song.featuredArtistsId,
    explicitContent: song.explicit_content || song.explicitContent || 0,
    playCount: song.play_count || song.playCount,
    language: song.language || song.language,
    hasLyrics: song.has_lyrics || song.hasLyrics || 'false',
    lyrics: song.lyrics || song.lyrics_data,
    lyricsId: song.lyrics_id || song.lyricsId,
    copyright: song.copyright || song.copyright_text,
    artists: transformArtists(song.artists || song.singers || song.primary_artists),
    image: transformImages(song.image || song.image_url),
    downloadUrl: transformDownloadUrls(song.downloadUrl || song.download_url || song.media_preview_url),
    url: song.url || song.perma_url || '',
    encryptedMediaUrl: song.encrypted_media_url || song.encryptedMediaUrl,
    encryptedMediaPath: song.encrypted_media_path || song.encryptedMediaPath,
    mediaPreviewUrl: song.media_preview_url || song.mediaPreviewUrl,
    permaUrl: song.perma_url || song.permaUrl || song.url,
    albumId: song.albumid || song.album_id || song.albumId,
    albumUrl: song.album_url || song.albumUrl,
    albumName: song.album || song.album_name || song.albumName,
  };
};

/**
 * Search songs by query
 * @param query - Search query string
 * @param page - Page number (optional, defaults to 1)
 * @returns Promise<SearchResponse>
 */
export const searchSongs = async (
  query: string,
  page: number = 1
): Promise<SearchResponse> => {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const response = await apiClient.get(API_ENDPOINTS.SEARCH_SONGS, {
      params: {
        query: query.trim(),
        page: page.toString(),
      },
    });

    const responseData = response.data;

    // Handle different response structures
    if (responseData.status === 'SUCCESS' || responseData.status === 'success') {
      const results = Array.isArray(responseData.data?.results)
        ? responseData.data.results
        : Array.isArray(responseData.data)
        ? responseData.data
        : [];

      return {
        status: responseData.status,
        message: responseData.message,
        data: {
          total: responseData.data?.total || results.length,
          start: (page - 1) * 20, // Assuming 20 results per page
          results: results.map(transformSong),
        },
      };
    }

    throw new Error(responseData.message || 'Search failed');
  } catch (error) {
    const apiError: ApiError = {
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to search songs',
      error,
    };
    console.error('searchSongs error:', apiError);
    throw apiError;
  }
};

/**
 * Get song details by ID
 * @param id - Song ID
 * @returns Promise<SongDetailsResponse>
 */
export const getSongById = async (id: string): Promise<SongDetailsResponse> => {
  try {
    if (!id || id.trim().length === 0) {
      throw new Error('Song ID cannot be empty');
    }

    const response = await apiClient.get(API_ENDPOINTS.SONG_DETAILS, {
      params: {
        id: id.trim(),
      },
    });

    const responseData = response.data;

    if (responseData.status === 'SUCCESS' || responseData.status === 'success') {
      const songs = Array.isArray(responseData.data) ? responseData.data : [responseData.data];

      return {
        status: responseData.status,
        message: responseData.message,
        data: songs.map(transformSong),
      };
    }

    throw new Error(responseData.message || 'Failed to get song details');
  } catch (error) {
    const apiError: ApiError = {
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get song details',
      error,
    };
    console.error('getSongById error:', apiError);
    throw apiError;
  }
};

/**
 * Get song suggestions based on a song ID
 * @param id - Song ID
 * @returns Promise<SuggestionsResponse>
 */
export const getSongSuggestions = async (id: string): Promise<SuggestionsResponse> => {
  try {
    if (!id || id.trim().length === 0) {
      throw new Error('Song ID cannot be empty');
    }

    const response = await apiClient.get(API_ENDPOINTS.SONG_SUGGESTIONS, {
      params: {
        id: id.trim(),
      },
    });

    const responseData = response.data;

    if (responseData.status === 'SUCCESS' || responseData.status === 'success') {
      const suggestions = Array.isArray(responseData.data) ? responseData.data : [];

      return {
        status: responseData.status,
        message: responseData.message,
        data: suggestions.map(transformSong),
      };
    }

    throw new Error(responseData.message || 'Failed to get song suggestions');
  } catch (error) {
    const apiError: ApiError = {
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get song suggestions',
      error,
    };
    console.error('getSongSuggestions error:', apiError);
    throw apiError;
  }
};

/**
 * Get artist details by ID
 * @param id - Artist ID
 * @returns Promise<ArtistDetailsResponse>
 */
export const getArtistById = async (id: string): Promise<ArtistDetailsResponse> => {
  try {
    if (!id || id.trim().length === 0) {
      throw new Error('Artist ID cannot be empty');
    }

    const response = await apiClient.get(API_ENDPOINTS.ARTIST_DETAILS, {
      params: {
        id: id.trim(),
      },
    });

    const responseData = response.data;

    if (responseData.status === 'SUCCESS' || responseData.status === 'success') {
      const artists = Array.isArray(responseData.data) ? responseData.data : [responseData.data];

      return {
        status: responseData.status,
        message: responseData.message,
        data: artists.map((artist: any) => ({
          id: artist.id || '',
          name: artist.name || artist.title || '',
          url: artist.url || artist.perma_url || '',
          image: transformImages(artist.image || artist.image_url),
          followerCount: artist.follower_count || artist.followerCount,
          fanCount: artist.fan_count || artist.fanCount,
          isVerified: artist.isVerified || false,
          dominantLanguage: artist.dominant_language || artist.dominantLanguage,
          dominantType: artist.dominant_type || artist.dominantType,
        })),
      };
    }

    throw new Error(responseData.message || 'Failed to get artist details');
  } catch (error) {
    const apiError: ApiError = {
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get artist details',
      error,
    };
    console.error('getArtistById error:', apiError);
    throw apiError;
  }
};

/**
 * Get songs by artist ID
 * @param id - Artist ID
 * @returns Promise<ArtistSongsResponse>
 */
export const getArtistSongs = async (id: string): Promise<ArtistSongsResponse> => {
  try {
    if (!id || id.trim().length === 0) {
      throw new Error('Artist ID cannot be empty');
    }

    const response = await apiClient.get(API_ENDPOINTS.ARTIST_SONGS, {
      params: {
        id: id.trim(),
      },
    });

    const responseData = response.data;

    if (responseData.status === 'SUCCESS' || responseData.status === 'success') {
      const songs = Array.isArray(responseData.data?.songs)
        ? responseData.data.songs
        : Array.isArray(responseData.data)
        ? responseData.data
        : [];

      return {
        status: responseData.status,
        message: responseData.message,
        data: songs.map(transformSong),
      };
    }

    throw new Error(responseData.message || 'Failed to get artist songs');
  } catch (error) {
    const apiError: ApiError = {
      status: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to get artist songs',
      error,
    };
    console.error('getArtistSongs error:', apiError);
    throw apiError;
  }
};

/**
 * Export the API client instance for advanced usage
 */
export default apiClient;

