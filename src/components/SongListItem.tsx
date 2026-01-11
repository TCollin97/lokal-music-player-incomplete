import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import type { Song } from '../types/api';
import { formatDuration } from '../utils/formatDuration';
import { usePlayerStore } from '../store/playerStore';
import { useAudioPlayerActions } from '../hooks/useAudioPlayer';

interface SongListItemProps {
  song: Song;
  onPress?: (song: Song) => void;
}

/**
 * Get image URL with preferred quality (150x150)
 */
const getImageUrl = (images: Song['image'], quality: string = '150x150'): string => {
  if (!images || images.length === 0) {
    return '';
  }

  // Try to find the preferred quality
  const preferredImage = images.find((img) => img.quality === quality);
  if (preferredImage) {
    return preferredImage.link;
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
 * Animated playing bar component
 */
const AnimatedPlayingBar: React.FC<{ delay: number }> = ({ delay }) => {
  const heightAnim = React.useRef(new Animated.Value(4)).current;

  React.useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(heightAnim, {
          toValue: 12,
          duration: 400,
          delay,
          useNativeDriver: false,
        }),
        Animated.timing(heightAnim, {
          toValue: 4,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (true) {
          // Always loop
          animate();
        }
      });
    };
    animate();
  }, [heightAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.playingBar,
        {
          height: heightAnim,
        },
      ]}
    />
  );
};

export const SongListItem: React.FC<SongListItemProps> = ({ song, onPress }) => {
  const { currentSong, isPlaying } = usePlayerStore();
  const { playSong } = useAudioPlayerActions();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

  const handlePress = () => {
    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress(song);
    } else {
      // Default behavior: play song
      playSong(song);
    }
  };

  const imageUrl = getImageUrl(song.image, '150x150');
  const artistNames = getArtistNames(song);
  const duration = formatDuration(song.duration || 0);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.container,
          isCurrentlyPlaying && styles.playingContainer,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
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
          {isCurrentlyPlaying && (
            <View style={styles.playingIndicator}>
              <AnimatedPlayingBar delay={0} />
              <AnimatedPlayingBar delay={200} />
              <AnimatedPlayingBar delay={400} />
            </View>
          )}
        </View>

        {/* Song Info */}
        <View style={styles.infoContainer}>
          <Text
            style={[styles.songName, isCurrentlyPlaying && styles.playingText]}
            numberOfLines={1}
          >
            {song.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {artistNames}
          </Text>
        </View>

        {/* Duration */}
        <Text style={styles.duration}>{duration}</Text>

        {/* Play Button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.playButtonText}>
            {isCurrentlyPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    minHeight: 80,
  },
  playingContainer: {
    backgroundColor: '#2A2A2A',
    borderLeftWidth: 3,
    borderLeftColor: '#1DB954',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#666',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  playingBar: {
    width: 3,
    backgroundColor: '#1DB954',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  songName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playingText: {
    color: '#1DB954',
  },
  artistName: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  duration: {
    fontSize: 14,
    color: '#B3B3B3',
    marginRight: 12,
    minWidth: 45,
    textAlign: 'right',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 16,
    color: '#000000',
  },
});

