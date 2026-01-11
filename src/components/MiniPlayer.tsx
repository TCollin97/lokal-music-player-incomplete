import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayerActions } from '../hooks/useAudioPlayer';
import type { Song } from '../types/api';

interface MiniPlayerProps {
  onPress?: () => void; // Navigate to Player screen
}

/**
 * Get image URL with preferred quality (50x50 for mini player)
 */
const getImageUrl = (images: Song['image'], quality: string = '50x50'): string => {
  if (!images || images.length === 0) {
    return '';
  }

  // Try to find the preferred quality
  const preferredImage = images.find((img) => img.quality === quality);
  if (preferredImage) {
    return preferredImage.link;
  }

  // Try 150x150 as fallback
  const fallbackImage = images.find((img) => img.quality === '150x150');
  if (fallbackImage) {
    return fallbackImage.link;
  }

  // Fallback to first available image
  return images[0]?.link || '';
};

/**
 * Get artist names from song
 */
const getArtistNames = (song: Song): string => {
  if (song.primaryArtists) {
    return song.primaryArtists;
  }

  if (song.artists && song.artists.length > 0) {
    return song.artists.map((artist) => artist.name).join(', ');
  }

  return 'Unknown Artist';
};

/**
 * Mini Player Component
 * Persistent player bar at the bottom of the screen
 */
export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const { currentSong, isPlaying, currentTime, duration } = usePlayerStore();
  const { play, pause, nextSong } = useAudioPlayerActions();

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Show/hide animation based on currentSong
  useEffect(() => {
    if (currentSong) {
      // Slide up and fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentSong, slideAnim, opacityAnim]);

  // Update progress bar animation
  useEffect(() => {
    if (duration > 0) {
      const progress = Math.min(currentTime / duration, 1);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 100,
        useNativeDriver: true, // Using translateX for better performance
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [currentTime, duration, progressAnim]);

  // Don't render if no current song
  if (!currentSong) {
    return null;
  }

  const imageUrl = getImageUrl(currentSong.image, '50x50');
  const artistNames = getArtistNames(currentSong);

  // Transform for slide animation (translateY)
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0], // Slide up from 100px below
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const handlePlayPause = (e: any) => {
    e.stopPropagation(); // Prevent triggering onPress
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleNext = (e: any) => {
    e.stopPropagation(); // Prevent triggering onPress
    nextSong();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={currentSong ? 'auto' : 'none'}
    >
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              transform: [
                {
                  scaleX: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* Main Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.songName} numberOfLines={1}>
            {currentSong.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {artistNames}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.controlButtonText}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.controlButtonText}>⏭</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#282828',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    zIndex: 1,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1DB954',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    color: '#666',
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  songName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    marginLeft: 8,
  },
  controlButtonText: {
    fontSize: 14,
    color: '#000000',
  },
});

