import { audioService } from '../services/audioService';
import { usePlayerStore } from '../store/playerStore';

/**
 * Initialize the app
 * - Load persisted state
 * - Set up audio session
 * - Configure background playback
 */
export const initializeApp = async (): Promise<void> => {
  try {
    // Initialize audio service
    await audioService.initialize();
    await audioService.enableBackgroundPlayback();

    // Load player state from storage
    usePlayerStore.getState().initializeFromStorage();

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
    throw error;
  }
};

