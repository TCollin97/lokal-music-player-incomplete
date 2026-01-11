import { MMKV } from 'react-native-mmkv';
import type { Song } from '../types/api';

/**
 * MMKV storage instance
 */
const storage = new MMKV({
  id: 'music-player-storage',
});

/**
 * Storage keys
 */
const KEYS = {
  QUEUE: 'player:queue',
  CURRENT_SONG: 'player:currentSong',
  REPEAT: 'player:repeat',
  SHUFFLE: 'player:shuffle',
  VOLUME: 'player:volume',
  SHUFFLED_QUEUE: 'player:shuffledQueue',
  ORIGINAL_QUEUE: 'player:originalQueue',
} as const;

/**
 * Player state interface for persistence
 */
export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  shuffledQueue?: Song[];
  originalQueue?: Song[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  volume: number;
}

/**
 * Save queue to storage
 */
export const saveQueue = (queue: Song[]): void => {
  try {
    storage.set(KEYS.QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving queue to storage:', error);
  }
};

/**
 * Load queue from storage
 */
export const loadQueue = (): Song[] => {
  try {
    const queueJson = storage.getString(KEYS.QUEUE);
    if (queueJson) {
      return JSON.parse(queueJson);
    }
  } catch (error) {
    console.error('Error loading queue from storage:', error);
  }
  return [];
};

/**
 * Save original queue (for shuffle mode)
 */
export const saveOriginalQueue = (queue: Song[]): void => {
  try {
    storage.set(KEYS.ORIGINAL_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving original queue:', error);
  }
};

/**
 * Load original queue
 */
export const loadOriginalQueue = (): Song[] => {
  try {
    const queueJson = storage.getString(KEYS.ORIGINAL_QUEUE);
    if (queueJson) {
      return JSON.parse(queueJson);
    }
  } catch (error) {
    console.error('Error loading original queue:', error);
  }
  return [];
};

/**
 * Save shuffled queue (for shuffle mode)
 */
export const saveShuffledQueue = (queue: Song[]): void => {
  try {
    storage.set(KEYS.SHUFFLED_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving shuffled queue:', error);
  }
};

/**
 * Load shuffled queue
 */
export const loadShuffledQueue = (): Song[] => {
  try {
    const queueJson = storage.getString(KEYS.SHUFFLED_QUEUE);
    if (queueJson) {
      return JSON.parse(queueJson);
    }
  } catch (error) {
    console.error('Error loading shuffled queue:', error);
  }
  return [];
};

/**
 * Save complete player state
 */
export const savePlayerState = (state: PlayerState): void => {
  try {
    saveQueue(state.queue);
    if (state.currentSong) {
      storage.set(KEYS.CURRENT_SONG, JSON.stringify(state.currentSong));
    } else {
      storage.delete(KEYS.CURRENT_SONG);
    }
    storage.set(KEYS.SHUFFLE, state.shuffle);
    storage.set(KEYS.REPEAT, state.repeat);
    storage.set(KEYS.VOLUME, state.volume);
    
    if (state.originalQueue) {
      saveOriginalQueue(state.originalQueue);
    }
    if (state.shuffledQueue) {
      saveShuffledQueue(state.shuffledQueue);
    }
  } catch (error) {
    console.error('Error saving player state:', error);
  }
};

/**
 * Load complete player state
 */
export const loadPlayerState = (): Partial<PlayerState> => {
  try {
    const queue = loadQueue();
    const originalQueue = loadOriginalQueue();
    const shuffledQueue = loadShuffledQueue();
    
    const currentSongJson = storage.getString(KEYS.CURRENT_SONG);
    const currentSong = currentSongJson ? JSON.parse(currentSongJson) : null;
    
    const shuffle = storage.getBoolean(KEYS.SHUFFLE) ?? false;
    const repeat = (storage.getString(KEYS.REPEAT) as 'off' | 'one' | 'all') ?? 'off';
    const volume = storage.getNumber(KEYS.VOLUME) ?? 1.0;

    return {
      currentSong,
      queue: shuffle && shuffledQueue.length > 0 ? shuffledQueue : queue,
      originalQueue: originalQueue.length > 0 ? originalQueue : queue,
      shuffledQueue: shuffledQueue.length > 0 ? shuffledQueue : undefined,
      shuffle,
      repeat,
      volume,
    };
  } catch (error) {
    console.error('Error loading player state:', error);
    return {};
  }
};

/**
 * Clear all storage
 */
export const clearStorage = (): void => {
  try {
    storage.delete(KEYS.QUEUE);
    storage.delete(KEYS.CURRENT_SONG);
    storage.delete(KEYS.REPEAT);
    storage.delete(KEYS.SHUFFLE);
    storage.delete(KEYS.VOLUME);
    storage.delete(KEYS.SHUFFLED_QUEUE);
    storage.delete(KEYS.ORIGINAL_QUEUE);
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

