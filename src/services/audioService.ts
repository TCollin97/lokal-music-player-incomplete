import { Audio } from 'expo-av';
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import type { Song } from '../types/api';
import { usePlayerStore } from '../store/playerStore';

/**
 * Playback status callback type
 */
type PlaybackStatusCallback = (status: AVPlaybackStatus) => void;

/**
 * Audio Service - Singleton pattern for managing audio playback
 */
class AudioService {
  private sound: Audio.Sound | null = null;
  private statusUpdateCallbacks: Set<PlaybackStatusCallback> = new Set();
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize audio service with background playback configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure audio mode for background playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });

      this.isInitialized = true;
      console.log('AudioService initialized');
    } catch (error) {
      console.error('Error initializing AudioService:', error);
      throw error;
    }
  }

  /**
   * Enable background playback (called separately if needed)
   */
  async enableBackgroundPlayback(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      });
      console.log('Background playback enabled');
    } catch (error) {
      console.error('Error enabling background playback:', error);
      throw error;
    }
  }

  /**
   * Get download URL from song (prefer 160kbps quality)
   */
  private getDownloadUrl(song: Song): string | null {
    if (!song.downloadUrl || song.downloadUrl.length === 0) {
      // Fallback to encryptedMediaUrl or mediaPreviewUrl
      return song.encryptedMediaUrl || song.mediaPreviewUrl || song.url || null;
    }

    // Prefer 160kbps quality
    const preferredQuality = song.downloadUrl.find((url) => url.quality === '160kbps');
    if (preferredQuality) {
      return preferredQuality.link;
    }

    // Fallback to any available quality
    const fallbackQuality = song.downloadUrl.find((url) => url.link);
    if (fallbackQuality) {
      return fallbackQuality.link;
    }

    // Return first available URL
    return song.downloadUrl[0]?.link || null;
  }

  /**
   * Load and play a song
   */
  async loadAndPlay(song: Song): Promise<void> {
    try {
      // Ensure audio service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Stop and unload current sound if exists
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
        } catch (error) {
          console.warn('Error unloading previous sound:', error);
        }
        this.sound = null;
      }

      // Get download URL
      const downloadUrl = this.getDownloadUrl(song);
      if (!downloadUrl) {
        throw new Error('No download URL available for this song');
      }

      // Update store with loading state
      usePlayerStore.getState().setIsLoading(true);

      // Load new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: downloadUrl },
        {
          shouldPlay: true,
          isLooping: false,
          volume: usePlayerStore.getState().volume,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = newSound;

      // Update store
      const store = usePlayerStore.getState();
      store.setCurrentSong(song);
      store.setDuration(song.duration || 0);
      store.setCurrentTime(0);
      store.setIsPlaying(true);
      store.setIsLoading(false);

      console.log('Song loaded and playing:', song.name);
    } catch (error) {
      console.error('Error loading and playing song:', error);
      usePlayerStore.getState().setIsLoading(false);
      usePlayerStore.getState().setIsPlaying(false);
      throw error;
    }
  }

  /**
   * Play current audio
   */
  async play(): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('No audio loaded');
      }

      await this.sound.playAsync();
      usePlayerStore.getState().setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      usePlayerStore.getState().setIsPlaying(false);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    try {
      if (!this.sound) {
        return;
      }

      await this.sound.pauseAsync();
      usePlayerStore.getState().setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
      throw error;
    }
  }

  /**
   * Stop and unload audio
   */
  async stop(): Promise<void> {
    try {
      if (!this.sound) {
        return;
      }

      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;

      const store = usePlayerStore.getState();
      store.setIsPlaying(false);
      store.setCurrentTime(0);
      store.setIsLoading(false);

      // Stop status update interval
      if (this.statusUpdateInterval) {
        clearInterval(this.statusUpdateInterval);
        this.statusUpdateInterval = null;
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
      throw error;
    }
  }

  /**
   * Seek to position in milliseconds
   */
  async seekTo(position: number): Promise<void> {
    try {
      if (!this.sound) {
        throw new Error('No audio loaded');
      }

      // position is in milliseconds, setPositionAsync also takes milliseconds
      await this.sound.setPositionAsync(position);
      // Store uses seconds, so convert milliseconds to seconds
      usePlayerStore.getState().setCurrentTime(position / 1000);
    } catch (error) {
      console.error('Error seeking audio:', error);
      throw error;
    }
  }

  /**
   * Set volume (0-1)
   */
  async setVolume(volume: number): Promise<void> {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));

      if (this.sound) {
        await this.sound.setVolumeAsync(clampedVolume);
      }

      usePlayerStore.getState().setVolume(clampedVolume);
    } catch (error) {
      console.error('Error setting volume:', error);
      throw error;
    }
  }

  /**
   * Register a playback status update callback
   */
  onPlaybackStatusUpdate(callback: PlaybackStatusCallback): () => void {
    this.statusUpdateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.statusUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Handle playback status updates
   */
  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      // Handle error state
      if (status.error) {
        console.error('Playback error:', status.error);
        usePlayerStore.getState().setIsLoading(false);
        usePlayerStore.getState().setIsPlaying(false);
      }
      return;
    }

    const successStatus = status as AVPlaybackStatusSuccess;
    const store = usePlayerStore.getState();

    // Update current time (convert from milliseconds to seconds)
    if (successStatus.positionMillis !== undefined) {
      const currentTimeSeconds = successStatus.positionMillis / 1000;
      store.setCurrentTime(currentTimeSeconds);
    }

    // Update duration (convert from milliseconds to seconds)
    if (successStatus.durationMillis !== undefined) {
      const durationSeconds = successStatus.durationMillis / 1000;
      if (durationSeconds > 0) {
        store.setDuration(durationSeconds);
      }
    }

    // Update playing state
    if (successStatus.isPlaying !== undefined) {
      store.setIsPlaying(successStatus.isPlaying);
    }

    // Handle playback completion
    if (
      successStatus.didJustFinish &&
      !successStatus.isLooping &&
      successStatus.isPlaying === false
    ) {
      // Don't await to avoid blocking status updates
      this.handlePlaybackCompletion().catch((error) => {
        console.error('Error in handlePlaybackCompletion:', error);
      });
    }

    // Notify registered callbacks
    this.statusUpdateCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in playback status callback:', error);
      }
    });
  }

  /**
   * Handle playback completion based on repeat mode
   */
  private async handlePlaybackCompletion(): Promise<void> {
    const store = usePlayerStore.getState();
    const { repeat } = store;

    try {
      if (repeat === 'one') {
        // Repeat current song - seek to beginning and play
        if (this.sound) {
          await this.seekTo(0); // seekTo expects milliseconds
          await this.play();
        }
      } else if (repeat === 'all') {
        // Play next song (will loop back to start if at end)
        store.nextSong();
      } else {
        // Repeat is 'off' - try to play next song, or stop if no next song
        store.nextSong();
      }
    } catch (error) {
      console.error('Error handling playback completion:', error);
      store.setIsPlaying(false);
    }
  }

  /**
   * Get current playback status
   */
  async getCurrentStatus(): Promise<AVPlaybackStatus | null> {
    try {
      if (!this.sound) {
        return null;
      }

      return await this.sound.getStatusAsync();
    } catch (error) {
      console.error('Error getting current status:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.statusUpdateCallbacks.clear();

    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export class for testing purposes
export default AudioService;

