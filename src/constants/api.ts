/**
 * API Configuration Constants
 */
export const API_BASE_URL = 'https://saavn.sumit.co';

export const API_ENDPOINTS = {
  SEARCH_SONGS: '/api/search/songs',
  SONG_DETAILS: '/api/songs',
  SONG_SUGGESTIONS: '/api/songs/suggestions',
  ARTIST_DETAILS: '/api/artists',
  ARTIST_SONGS: '/api/artists/songs',
} as const;

export const API_TIMEOUT = 30000; // 30 seconds

