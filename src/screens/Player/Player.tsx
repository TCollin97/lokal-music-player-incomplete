import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  StatusBar,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { formatDuration } from '../../utils/formatDuration';
import type { Song } from '../../types/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlayerScreenProps {
  route?: any;
}

/**
 * Get image URL with preferred quality
 */
const getImageUrl = (images: Song['image'], quality: string = '500x500'): string => {
  if (!images || images.length === 0) {
    return '';
  }

  // Try to find the preferred quality
  const preferredImage = images.find((img) => img.quality === quality);
  if (preferredImage) {
    return preferredImage.link;
  }

  // Try 1000x1000 as fallback
  const fallbackImage = images.find((img) => img.quality === '1000x1000');
  if (fallbackImage) {
    return fallbackImage.link;
  }

  // Try 150x150 as fallback
  const smallFallback = images.find((img) => img.quality === '150x150');
  if (smallFallback) {
    return smallFallback.link;
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
 * Custom Slider Component
 */
const SeekSlider: React.FC<{
  value: number; // in seconds
  maximumValue: number; // in seconds
  onValueChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}> = ({ value, maximumValue, onValueChange, onSlidingComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const thumbStartPositionRef = useRef(0);
  const sliderWidth = SCREEN_WIDTH - 64;
  const trackWidth = sliderWidth - 32;

  useEffect(() => {
    if (!isDragging) {
      setDragValue(value);
    }
  }, [value, isDragging]);

  const currentValue = isDragging ? dragValue : value;
  const progress = maximumValue > 0 ? Math.max(0, Math.min(100, (currentValue / maximumValue) * 100)) : 0;
  const thumbPosition = (progress / 100) * trackWidth;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        const touchX = evt.nativeEvent.locationX;
        const newProgress = (touchX / trackWidth) * 100;
        const newValue = Math.max(0, Math.min(maximumValue, (newProgress / 100) * maximumValue));
        setDragValue(newValue);
        thumbStartPositionRef.current = thumbPosition;
        onValueChange(newValue);
      },
      onPanResponderMove: (evt, gestureState) => {
        const newPosition = thumbStartPositionRef.current + gestureState.dx;
        const clampedPosition = Math.max(0, Math.min(trackWidth, newPosition));
        const newProgress = (clampedPosition / trackWidth) * 100;
        const newValue = Math.max(0, Math.min(maximumValue, (newProgress / 100) * maximumValue));
        setDragValue(newValue);
        onValueChange(newValue);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        onSlidingComplete(dragValue);
      },
    })
  ).current;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        <View
          style={[
            styles.sliderProgress,
            {
              width: `${progress}%`,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: thumbPosition,
            },
          ]}
          {...panResponder.panHandlers}
        />
      </View>
    </View>
  );
};

/**
 * Album Artwork with Animation
 */
const AlbumArtwork: React.FC<{
  imageUrl: string;
  isPlaying: boolean;
}> = ({ imageUrl, isPlaying }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      // Rotation animation (continuous)
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      rotateAnim.stopAnimation();
      pulseAnim.stopAnimation();
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isPlaying, rotateAnim, pulseAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.artworkContainer}>
      <Animated.View
        style={[
          styles.artworkWrapper,
          {
            transform: [{ rotate }, { scale: pulseAnim }],
          },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={styles.artworkPlaceholderText}>♪</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

/**
 * Repeat Button Component
 */
const RepeatButton: React.FC<{
  mode: 'off' | 'one' | 'all';
  onPress: () => void;
}> = ({ mode, onPress }) => {
  const isActive = mode !== 'off';

  const getIcon = () => {
    switch (mode) {
      case 'one':
        return <MaterialIcons name="repeat-one" size={24} color={isActive ? '#000' : '#FFF'} />;
      case 'all':
        return <MaterialIcons name="repeat" size={24} color={isActive ? '#000' : '#FFF'} />;
      default:
        return <MaterialIcons name="repeat" size={24} color="#666" />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.controlButton, isActive && styles.controlButtonActive]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {getIcon()}
    </TouchableOpacity>
  );
};

/**
 * Player Screen Component
 */
export const PlayerScreen: React.FC<PlayerScreenProps> = () => {
  const navigation = useNavigation();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    shuffle,
    repeat,
    queue,
  } = usePlayerStore();

  const {
    play,
    pause,
    nextSong,
    previousSong,
    toggleShuffle,
    setRepeat,
    addToQueue,
  } = useAudioPlayerActions();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Initialize seek value
  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  // Swipe down gesture to minimize
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 50;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          // Swipe down threshold reached, go back
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!currentSong) {
    // No song playing, go back
    navigation.goBack();
    return null;
  }

  const imageUrl = getImageUrl(currentSong.image, '500x500');
  const artistNames = getArtistNames(currentSong);
  const albumName = currentSong.album?.name || 'Unknown Album';

  const handleSeek = (value: number) => {
    setIsSeeking(true);
    setSeekValue(value);
  };

  const handleSeekComplete = async (value: number) => {
    setIsSeeking(false);
    // Seek to position using audioService
    const { audioService } = await import('../../services/audioService');
    await audioService.seekTo(value * 1000); // Convert to milliseconds
  };

  const handleRepeatPress = () => {
    const modes: Array<'off' | 'one' | 'all'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeat(modes[nextIndex]);
  };

  const handleToggleShuffle = () => {
    toggleShuffle();
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleAddToQueue = () => {
    if (currentSong) {
      addToQueue(currentSong);
    }
  };

  const handleQueuePress = () => {
    // Navigate to Queue screen
    // navigation.navigate('Queue');
  };

  const displayTime = isSeeking ? seekValue : currentTime;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backButtonText}>⬇</Text>
          </TouchableOpacity>

          <View style={styles.songInfo}>
            <Text style={styles.songName} numberOfLines={1}>
              {currentSong.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {artistNames}
            </Text>
            <Text style={styles.albumName} numberOfLines={1}>
              {albumName}
            </Text>
          </View>
        </View>

        {/* Middle Section - Album Artwork */}
        <View style={styles.middleSection}>
          <AlbumArtwork imageUrl={imageUrl} isPlaying={isPlaying} />
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <SeekSlider
            value={displayTime}
            maximumValue={duration || 0}
            onValueChange={handleSeek}
            onSlidingComplete={handleSeekComplete}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatDuration(displayTime)}</Text>
            <Text style={styles.timeText}>{formatDuration(duration || 0)}</Text>
          </View>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              shuffle && styles.controlButtonActive,
            ]}
            onPress={handleToggleShuffle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="shuffle"
              size={24}
              color={shuffle ? '#000' : '#FFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={previousSong}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5
              name="step-backward"
              size={20}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={36}
              color="#000"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={nextSong}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5
              name="step-forward"
              size={20}
              color="#FFF"
            />
          </TouchableOpacity>

          <RepeatButton mode={repeat} onPress={handleRepeatPress} />
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleAddToQueue}
          >
            <Text style={styles.bottomButtonText}>Add to Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomButton, styles.queueButton]}
            onPress={handleQueuePress}
          >
            <Text style={styles.bottomButtonText}>
              Queue ({queue.length})
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#B3B3B3',
    marginBottom: 2,
  },
  albumName: {
    fontSize: 14,
    color: '#666',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  artworkContainer: {
    width: SCREEN_WIDTH - 80,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: (SCREEN_WIDTH - 80) / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 80,
    color: '#666',
  },
  progressSection: {
    paddingVertical: 24,
  },
  sliderContainer: {
    paddingHorizontal: 8,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    position: 'relative',
  },
  sliderProgress: {
    height: 4,
    backgroundColor: '#1DB954',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1DB954',
    position: 'absolute',
    top: -6,
    marginLeft: -8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  controlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#1DB954',
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    paddingBottom: 32,
  },
  bottomButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  queueButton: {
    backgroundColor: '#282828',
    marginLeft: 12,
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

