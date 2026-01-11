import { useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';
import { usePlayerStore } from '../store/playerStore';
import type { Song } from '../types/api';

/**
 * Hook to initialize and connect audio service
 * Initialize audio service and set up playback status listeners
 */
export const useAudioPlayer = () => {
  const isInitializedRef = useRef(false);
  const previousSongIdRef = useRef<string | null>(null);

  // Initialize audio service on mount
  useEffect(() => {
    const init = async () => {
      if (!isInitializedRef.current) {
        try {
          await audioService.initialize();
          await audioService.enableBackgroundPlayback();
          isInitializedRef.current = true;
        } catch (error) {
          console.error('Error initializing audio service:', error);
        }
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      audioService.cleanup().catch(console.error);
    };
  }, []);

  // Set up playback status update listener
  useEffect(() => {
    const unsubscribe = audioService.onPlaybackStatusUpdate((status) => {
      // Status updates are handled by audioService's internal callback
      // which updates the store automatically
    });

    return unsubscribe;
  }, []);

  // Connect store actions to audio service
  // Listen for when currentSong changes and trigger playback
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
      (state) => ({
        currentSong: state.currentSong,
        isPlaying: state.isPlaying,
      }),
      async ({ currentSong, isPlaying }) => {
        // Only load and play if song changed and we want to play
        if (
          currentSong &&
          isPlaying &&
          currentSong.id !== previousSongIdRef.current
        ) {
          previousSongIdRef.current = currentSong.id;
          try {
            await audioService.loadAndPlay(currentSong);
          } catch (error) {
            console.error('Error playing song:', error);
            usePlayerStore.getState().setIsPlaying(false);
            usePlayerStore.getState().setIsLoading(false);
          }
        } else if (!currentSong && previousSongIdRef.current !== null) {
          // Song was cleared, stop playback
          previousSongIdRef.current = null;
          await audioService.stop();
        }
      }
    );

    return unsubscribe;
  }, []);

  // Connect isPlaying toggle to audio service
  useEffect(() => {
    const store = usePlayerStore.getState();
    const unsubscribe = usePlayerStore.subscribe(
      (state) => state.isPlaying,
      async (isPlaying) => {
        const { currentSong } = store;
        if (!currentSong) return;

        try {
          const status = await audioService.getCurrentStatus();
          if (isPlaying) {
            if (status && status.isLoaded && !status.isPlaying) {
              await audioService.play();
            } else if (!status || !status.isLoaded) {
              // Not loaded, loadAndPlay will handle it
              if (currentSong.id === previousSongIdRef.current) {
                await audioService.play();
              }
            }
          } else {
            if (status && status.isLoaded && status.isPlaying) {
              await audioService.pause();
            }
          }
        } catch (error) {
          console.error('Error toggling playback:', error);
        }
      }
    );

    return unsubscribe;
  }, []);

  // Connect volume changes to audio service
  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe(
      (state) => state.volume,
      async (volume) => {
        try {
          await audioService.setVolume(volume);
        } catch (error) {
          console.error('Error setting volume:', error);
        }
      }
    );

    return unsubscribe;
  }, []);

  return {
    audioService,
  };
};

/**
 * Utility functions to use audio service with store
 */
export const useAudioPlayerActions = () => {
  const store = usePlayerStore();

  return {
    // Play a song (triggers both store and audio service)
    playSong: async (song: Song) => {
      store.playSong(song);
      // The hook will handle loading and playing via subscription
    },
    // Pause playback
    pause: async () => {
      store.pauseSong();
      // The hook will handle pausing via subscription
    },
    // Resume playback
    resume: async () => {
      store.resumeSong();
      // The hook will handle resuming via subscription
    },
    // Seek to position (in milliseconds)
    seekTo: async (positionMs: number) => {
      await audioService.seekTo(positionMs);
      // Store will be updated by status callback
    },
    // Next song
    nextSong: () => {
      store.nextSong();
      // The hook will handle loading and playing via subscription
    },
    // Previous song
    previousSong: () => {
      store.previousSong();
      // The hook will handle loading and playing via subscription
    },
  };
};

