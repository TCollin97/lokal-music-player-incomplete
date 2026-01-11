import { create } from 'zustand';
import type { Song } from '../types/api';
import {
  saveQueue,
  loadQueue,
  saveOriginalQueue,
  loadOriginalQueue,
  saveShuffledQueue,
  loadShuffledQueue,
  savePlayerState,
  loadPlayerState,
} from '../utils/storage';
import { shuffleArray } from '../utils/shuffle';

/**
 * Player Store State Interface
 */
interface PlayerState {
  // State
  currentSong: Song | null;
  queue: Song[];
  originalQueue: Song[]; // Original order for shuffle mode
  shuffledQueue: Song[]; // Shuffled order when shuffle is on
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number; // in seconds
  isLoading: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  volume: number; // 0-1

  // Actions
  playSong: (song: Song) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (time: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  setRepeat: (mode: 'off' | 'one' | 'all') => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentSong: (song: Song | null) => void;
  setIsLoading: (loading: boolean) => void;
  initializeFromStorage: () => void;
}

/**
 * Get the effective queue (shuffled or original)
 */
const getEffectiveQueue = (state: {
  queue: Song[];
  shuffle: boolean;
  originalQueue: Song[];
  shuffledQueue: Song[];
}): Song[] => {
  if (state.shuffle && state.shuffledQueue.length > 0) {
    return state.shuffledQueue;
  }
  if (!state.shuffle && state.originalQueue.length > 0) {
    return state.originalQueue;
  }
  return state.queue;
};

/**
 * Get the next song index considering shuffle and repeat modes
 */
const getNextSongIndex = (
  currentIndex: number,
  queue: Song[],
  shuffle: boolean,
  repeat: 'off' | 'one' | 'all'
): number | null => {
  if (queue.length === 0) return null;

  if (repeat === 'one') {
    return currentIndex; // Repeat current song
  }

  if (repeat === 'all' && currentIndex === queue.length - 1) {
    // If repeating all and at last song, go to first
    return shuffle ? Math.floor(Math.random() * queue.length) : 0;
  }

  if (currentIndex < queue.length - 1) {
    // Not at the end
    if (shuffle) {
      // In shuffle mode, pick random song (could be same as current)
      let nextIndex = Math.floor(Math.random() * queue.length);
      // Make sure we don't repeat the same song immediately
      while (nextIndex === currentIndex && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      return nextIndex;
    }
    return currentIndex + 1;
  }

  // At the end
  if (repeat === 'all') {
    if (shuffle) {
      let nextIndex = Math.floor(Math.random() * queue.length);
      while (nextIndex === currentIndex && queue.length > 1) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      return nextIndex;
    }
    return 0;
  }

  // Repeat is 'off', no next song
  return null;
};

/**
 * Get the previous song index
 */
const getPreviousSongIndex = (
  currentIndex: number,
  queue: Song[],
  shuffle: boolean,
  repeat: 'off' | 'one' | 'all',
  history: Song[] // Track history for shuffle mode
): number | null => {
  if (queue.length === 0) return null;

  if (shuffle) {
    // In shuffle mode, go back in history if available
    if (history.length > 0) {
      const previousSong = history[history.length - 1];
      const previousIndex = queue.findIndex((s) => s.id === previousSong.id);
      if (previousIndex !== -1) {
        return previousIndex;
      }
    }
    // If no history, pick random
    let prevIndex = Math.floor(Math.random() * queue.length);
    while (prevIndex === currentIndex && queue.length > 1) {
      prevIndex = Math.floor(Math.random() * queue.length);
    }
    return prevIndex;
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  // At the beginning with repeat all
  if (repeat === 'all') {
    return queue.length - 1;
  }

  return null;
};

// History tracking for shuffle mode
let playHistory: Song[] = [];

/**
 * Player Store
 */
export const usePlayerStore = create<PlayerState>((set, get) => {
  // Load initial state from storage
  const initialState = loadPlayerState();

  return {
    // Initial State (loaded from storage)
    currentSong: initialState.currentSong || null,
    queue: initialState.queue || [],
    originalQueue: initialState.originalQueue || initialState.queue || [],
    shuffledQueue: initialState.shuffledQueue || [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    shuffle: initialState.shuffle ?? false,
    repeat: initialState.repeat ?? 'off',
    volume: initialState.volume ?? 1.0,

    // Initialize from storage (called on app start)
    initializeFromStorage: () => {
      const state = loadPlayerState();
      set({
        currentSong: state.currentSong || null,
        queue: state.queue || [],
        originalQueue: state.originalQueue || state.queue || [],
        shuffledQueue: state.shuffledQueue || [],
        shuffle: state.shuffle ?? false,
        repeat: state.repeat ?? 'off',
        volume: state.volume ?? 1.0,
      });
    },

    // Actions
    playSong: (song: Song) => {
      const { queue, shuffle, originalQueue, shuffledQueue } = get();
      const effectiveQueue = getEffectiveQueue({ queue, shuffle, originalQueue, shuffledQueue });
      const songIndex = effectiveQueue.findIndex((s) => s.id === song.id);

      // Add to history
      if (playHistory.length > 50) {
        playHistory = playHistory.slice(-50); // Keep last 50
      }
      if (song.id !== get().currentSong?.id) {
        if (get().currentSong) {
          playHistory.push(get().currentSong);
        }
      }

      // If song is not in queue, add it and play
      if (songIndex === -1) {
        const newQueue = [song, ...effectiveQueue];
        const newOriginalQueue = shuffle ? originalQueue : [song, ...originalQueue];

        set({
          currentSong: song,
          queue: newQueue,
          originalQueue: newOriginalQueue,
          isPlaying: true,
          currentTime: 0,
          duration: song.duration || 0,
          isLoading: true,
        });

        saveQueue(newQueue);
        saveOriginalQueue(newOriginalQueue);
        savePlayerState(get());
      } else {
        // Song is in queue, just set it as current and play
        set({
          currentSong: song,
          isPlaying: true,
          currentTime: 0,
          duration: song.duration || 0,
          isLoading: true,
        });
        savePlayerState(get());
      }
    },

    pauseSong: () => {
      set({ isPlaying: false });
      savePlayerState(get());
    },

    resumeSong: () => {
      const { currentSong } = get();
      if (currentSong) {
        set({ isPlaying: true });
        savePlayerState(get());
      }
    },

    nextSong: () => {
      const { currentSong, queue, shuffle, originalQueue, shuffledQueue, repeat } = get();
      if (!currentSong || queue.length === 0) return;

      const effectiveQueue = getEffectiveQueue({ queue, shuffle, originalQueue, shuffledQueue });
      const currentIndex = effectiveQueue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex === -1) return;

      const nextIndex = getNextSongIndex(currentIndex, effectiveQueue, shuffle, repeat);

      if (nextIndex !== null && nextIndex < effectiveQueue.length) {
        const nextSong = effectiveQueue[nextIndex];
        
        // Add to history
        if (currentSong.id !== nextSong.id) {
          if (playHistory.length > 50) {
            playHistory = playHistory.slice(-50);
          }
          playHistory.push(currentSong);
        }

        set({
          currentSong: nextSong,
          isPlaying: true,
          currentTime: 0,
          duration: nextSong.duration || 0,
          isLoading: true,
        });
        savePlayerState(get());
      } else {
        // No next song available
        set({ isPlaying: false });
        savePlayerState(get());
      }
    },

    previousSong: () => {
      const { currentSong, queue, shuffle, originalQueue, shuffledQueue, repeat } = get();
      if (!currentSong || queue.length === 0) return;

      const effectiveQueue = getEffectiveQueue({ queue, shuffle, originalQueue, shuffledQueue });
      const currentIndex = effectiveQueue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex === -1) return;

      const previousIndex = getPreviousSongIndex(
        currentIndex,
        effectiveQueue,
        shuffle,
        repeat,
        playHistory
      );

      if (previousIndex !== null && previousIndex >= 0 && previousIndex < effectiveQueue.length) {
        const previousSong = effectiveQueue[previousIndex];
        
        // Remove from history if going back
        if (shuffle && playHistory.length > 0) {
          const lastPlayed = playHistory[playHistory.length - 1];
          if (lastPlayed.id === previousSong.id) {
            playHistory = playHistory.slice(0, -1);
          }
        }

        set({
          currentSong: previousSong,
          isPlaying: true,
          currentTime: 0,
          duration: previousSong.duration || 0,
          isLoading: true,
        });
        savePlayerState(get());
      }
    },

    seekTo: (time: number) => {
      const { duration } = get();
      const clampedTime = Math.max(0, Math.min(time, duration));
      set({ currentTime: clampedTime });
    },

    addToQueue: (song: Song) => {
      const { queue, shuffle, originalQueue } = get();
      // Check if song already exists in queue
      const exists = queue.some((s) => s.id === song.id);
      if (!exists) {
        const newQueue = [...queue, song];
        const newOriginalQueue = [...originalQueue, song];
        const newShuffledQueue = shuffle ? shuffleArray(newOriginalQueue) : [];

        set({
          queue: shuffle && newShuffledQueue.length > 0 ? newShuffledQueue : newQueue,
          originalQueue: newOriginalQueue,
          shuffledQueue: newShuffledQueue,
        });
        saveQueue(newQueue);
        saveOriginalQueue(newOriginalQueue);
        if (shuffle && newShuffledQueue.length > 0) {
          saveShuffledQueue(newShuffledQueue);
        }
        savePlayerState(get());
      }
    },

    removeFromQueue: (index: number) => {
      const { queue, currentSong, shuffle, originalQueue, shuffledQueue } = get();
      if (index < 0 || index >= queue.length) return;

      const effectiveQueue = getEffectiveQueue({ queue, shuffle, originalQueue, shuffledQueue });
      const removedSong = effectiveQueue[index];
      const newEffectiveQueue = effectiveQueue.filter((_, i) => i !== index);

      // Update both original and shuffled queues
      const songId = removedSong.id;
      const newOriginalQueue = originalQueue.filter((s) => s.id !== songId);
      const newShuffledQueue = shuffledQueue.filter((s) => s.id !== songId);

      // If removed song is current song, handle it
      if (currentSong && currentSong.id === removedSong.id) {
        const nextIndex = getNextSongIndex(
          index,
          newEffectiveQueue,
          shuffle,
          get().repeat
        );
        if (nextIndex !== null && nextIndex < newEffectiveQueue.length) {
          const nextSong = newEffectiveQueue[nextIndex];
          set({
            currentSong: nextSong,
            queue: newEffectiveQueue,
            originalQueue: newOriginalQueue,
            shuffledQueue: shuffle ? newShuffledQueue : [],
            isPlaying: true,
            currentTime: 0,
            duration: nextSong.duration || 0,
          });
        } else {
          set({
            currentSong: null,
            queue: newEffectiveQueue,
            originalQueue: newOriginalQueue,
            shuffledQueue: shuffle ? newShuffledQueue : [],
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          });
        }
      } else {
        set({
          queue: newEffectiveQueue,
          originalQueue: newOriginalQueue,
          shuffledQueue: shuffle ? newShuffledQueue : [],
        });
      }
      saveQueue(newEffectiveQueue);
      saveOriginalQueue(newOriginalQueue);
      if (shuffle) {
        saveShuffledQueue(newShuffledQueue);
      }
      savePlayerState(get());
    },

    reorderQueue: (from: number, to: number) => {
      const { queue, shuffle, originalQueue, shuffledQueue } = get();
      if (from < 0 || from >= queue.length || to < 0 || to >= queue.length) return;

      const effectiveQueue = getEffectiveQueue({ queue, shuffle, originalQueue, shuffledQueue });
      const newEffectiveQueue = [...effectiveQueue];
      const [removed] = newEffectiveQueue.splice(from, 1);
      newEffectiveQueue.splice(to, 0, removed);

      // Update original queue
      const newOriginalQueue = [...originalQueue];
      const originalFromIndex = originalQueue.findIndex(
        (s) => s.id === effectiveQueue[from].id
      );
      const originalToIndex = originalQueue.findIndex(
        (s) => s.id === effectiveQueue[to]?.id || s.id === effectiveQueue[from].id
      );
      if (originalFromIndex !== -1 && originalToIndex !== -1) {
        const [removedOriginal] = newOriginalQueue.splice(originalFromIndex, 1);
        newOriginalQueue.splice(originalToIndex, 0, removedOriginal);
      }

      set({
        queue: shuffle ? shuffledQueue : newEffectiveQueue,
        originalQueue: newOriginalQueue,
      });
      saveQueue(newEffectiveQueue);
      saveOriginalQueue(newOriginalQueue);
      savePlayerState(get());
    },

    clearQueue: () => {
      set({
        queue: [],
        originalQueue: [],
        shuffledQueue: [],
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      });
      saveQueue([]);
      saveOriginalQueue([]);
      saveShuffledQueue([]);
      savePlayerState(get());
    },

    toggleShuffle: () => {
      const { shuffle, originalQueue, queue } = get();
      const newShuffle = !shuffle;

      if (newShuffle) {
        // Enable shuffle - create shuffled queue from original
        const shuffled = shuffleArray(originalQueue.length > 0 ? originalQueue : queue);
        set({
          shuffle: newShuffle,
          shuffledQueue: shuffled,
          queue: shuffled,
        });
        saveShuffledQueue(shuffled);
      } else {
        // Disable shuffle - restore original queue
        set({
          shuffle: newShuffle,
          queue: originalQueue.length > 0 ? originalQueue : queue,
        });
      }
      savePlayerState(get());
    },

    setRepeat: (mode: 'off' | 'one' | 'all') => {
      set({ repeat: mode });
      savePlayerState(get());
    },

    setCurrentTime: (time: number) => {
      const { duration } = get();
      const clampedTime = Math.max(0, Math.min(time, duration));
      set({ currentTime: clampedTime });
    },

    setDuration: (duration: number) => {
      set({ duration: Math.max(0, duration) });
    },

    setIsPlaying: (playing: boolean) => {
      set({ isPlaying: playing });
      savePlayerState(get());
    },

    setVolume: (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      set({ volume: clampedVolume });
      savePlayerState(get());
    },

    setCurrentSong: (song: Song | null) => {
      set({ currentSong: song });
      savePlayerState(get());
    },

    setIsLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
  };
});
