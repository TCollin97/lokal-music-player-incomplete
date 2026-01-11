import { create } from 'zustand';
import type { Song } from '../types/api';

/**
 * Search Store State Interface
 */
interface SearchState {
  // State
  searchQuery: string;
  searchResults: Song[];
  isSearching: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Song[]) => void;
  setIsSearching: (searching: boolean) => void;
  clearSearch: () => void;
}

/**
 * Search Store
 */
export const useSearchStore = create<SearchState>((set) => ({
  // Initial State
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  // Actions
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSearchResults: (results: Song[]) => {
    set({ searchResults: results });
  },

  setIsSearching: (searching: boolean) => {
    set({ isSearching: searching });
  },

  clearSearch: () => {
    set({
      searchQuery: '',
      searchResults: [],
      isSearching: false,
    });
  },
}));

