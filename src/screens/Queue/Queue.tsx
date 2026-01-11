import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { usePlayerStore } from '../store/playerStore';
import type { Song } from '../types/api';

/**
 * Get image URL with preferred quality
 */
const getImageUrl = (images: Song['image'], quality: string = '150x150'): string => {
  if (!images || images.length === 0) {
    return '';
  }

  const preferredImage = images.find((img) => img.quality === quality);
  if (preferredImage) {
    return preferredImage.link;
  }

  const fallbackImage = images.find((img) => img.quality === '500x500');
  if (fallbackImage) {
    return fallbackImage.link;
  }

  return images[0]?.link || '';
};

/**
 * Get artist names from song
 */
const getArtistNames = (song: Song): string => {
  if (song.primaryArtists) {
    return song.primaryArtists;
  }

  return 'Unknown Artist';
};

/**
 * Animated playing bar component
 */
const AnimatedPlayingBar: React.FC<{ delay: number }> = ({ delay }) => {
  const heightAnim = useRef(new Animated.Value(4)).current;

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
        animate();
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

interface QueueItemProps {
  song: Song;
  isCurrentSong: boolean;
  onPress: () => void;
  onRemove: () => void;
  drag: () => void;
  isActive: boolean;
  index: number;
}

/**
 * Queue Item Component
 */
const QueueItem: React.FC<QueueItemProps> = ({
  song,
  isCurrentSong,
  onPress,
  onRemove,
  drag,
  isActive,
}) => {
  const imageUrl = getImageUrl(song.image, '150x150');
  const artistNames = getArtistNames(song);
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !isActive && gestureState.dx < -10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0) {
          const clampedDx = Math.max(gestureState.dx, -80);
          translateX.setValue(clampedDx);
          const opacity = Math.min(1, Math.abs(clampedDx) / 80);
          deleteOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -200,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onRemove();
            translateX.setValue(0);
            deleteOpacity.setValue(0);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(deleteOpacity, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <ScaleDecorator>
      <View style={styles.queueItemWrapper}>
        <Animated.View
          style={[
            styles.deleteBackground,
            {
              opacity: deleteOpacity,
            },
          ]}
        >
          <Text style={styles.deleteBackgroundText}>Delete</Text>
        </Animated.View>

        <Animated.View
          style={[
            {
              transform: [{ translateX }],
            },
          ]}
          {...(!isCurrentSong ? panResponder.panHandlers : {})}
        >
          <TouchableOpacity
            style={[
              styles.queueItem,
              isCurrentSong && styles.queueItemCurrent,
              isActive && styles.queueItemActive,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={styles.dragHandle}
              onPressIn={drag}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.dragHandleIcon}>☰</Text>
            </TouchableOpacity>

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

            <View style={styles.songInfo}>
              <Text
                style={[
                  styles.songName,
                  isCurrentSong && styles.songNameCurrent,
                ]}
                numberOfLines={1}
              >
                {song.name}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {artistNames}
              </Text>
            </View>

            {!isCurrentSong && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={onRemove}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            )}

            {isCurrentSong && (
              <View style={styles.playingIndicator}>
                <AnimatedPlayingBar delay={0} />
                <AnimatedPlayingBar delay={200} />
                <AnimatedPlayingBar delay={400} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScaleDecorator>
  );
};

/**
 * Currently Playing Section Component
 */
const CurrentlyPlayingSection: React.FC<{
  song: Song;
  onPress: () => void;
}> = ({ song, onPress }) => {
  const imageUrl = getImageUrl(song.image, '150x150');
  const artistNames = getArtistNames(song);

  return (
    <View style={styles.currentSection}>
      <Text style={styles.currentSectionTitle}>Now Playing</Text>
      <TouchableOpacity
        style={styles.currentItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.thumbnailContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.currentThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.currentThumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}
        </View>

        <View style={styles.currentSongInfo}>
          <Text style={styles.currentSongName} numberOfLines={1}>
            {song.name}
          </Text>
          <Text style={styles.currentArtistName} numberOfLines={1}>
            {artistNames}
          </Text>
        </View>

        <View style={styles.playingIndicator}>
          <AnimatedPlayingBar delay={0} />
          <AnimatedPlayingBar delay={200} />
          <AnimatedPlayingBar delay={400} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Queue Screen Component
 */
export const QueueScreen: React.FC = () => {
  const {
    currentSong,
    queue,
    removeFromQueue,
    reorderQueue,
    playSong,
  } = usePlayerStore();

  const queueWithoutCurrent = useMemo(() => {
    if (!currentSong) {
      return queue;
    }
    return queue.filter((song) => song.id !== currentSong.id);
  }, [queue, currentSong]);

  const handleDragEnd = useCallback(
    ({ data }: { data: Song[]; from: number; to: number }) => {
      // Update the entire queue with the new order
      const newQueue = currentSong ? [currentSong, ...data] : data;
      // Update store with reordered queue
      reorderQueue(0, 0); // Placeholder - you'll need to implement full queue update
    },
    [currentSong, reorderQueue]
  );

  const handleItemPress = useCallback(
    (song: Song) => {
      playSong(song);
    },
    [playSong]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const song = queueWithoutCurrent[index];
      if (song) {
        const actualIndex = queue.findIndex((s) => s.id === song.id);
        if (actualIndex !== -1) {
          removeFromQueue(actualIndex);
        }
      }
    },
    [queueWithoutCurrent, queue, removeFromQueue]
  );

  const handleClearAll = useCallback(() => {
    queueWithoutCurrent.forEach((song) => {
      const actualIndex = queue.findIndex((s) => s.id === song.id);
      if (actualIndex !== -1) {
        removeFromQueue(actualIndex);
      }
    });
  }, [queueWithoutCurrent, queue, removeFromQueue]);

  const renderItem = useCallback(
    ({ item, index, drag, isActive }: RenderItemParams<Song>) => {
      const isCurrentSong = currentSong?.id === item.id;

      return (
        <QueueItem
          song={item}
          isCurrentSong={isCurrentSong}
          onPress={() => handleItemPress(item)}
          onRemove={() => handleRemove(index)}
          drag={drag}
          isActive={isActive}
          index={index}
        />
      );
    },
    [currentSong, handleItemPress, handleRemove]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🎵</Text>
      <Text style={styles.emptyStateTitle}>Queue is Empty</Text>
      <Text style={styles.emptyStateText}>
        Add songs to your queue to play them next
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue</Text>
        {queueWithoutCurrent.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {currentSong && (
        <CurrentlyPlayingSection
          song={currentSong}
          onPress={() => handleItemPress(currentSong)}
        />
      )}

      {queueWithoutCurrent.length > 0 ? (
        <DraggableFlatList
          data={queueWithoutCurrent}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>{renderEmptyState()}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  currentSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  currentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B3B3B3',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
  },
  currentThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  currentSongInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  currentSongName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1DB954',
    marginBottom: 4,
  },
  currentArtistName: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  playingBar: {
    width: 3,
    backgroundColor: '#1DB954',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemWrapper: {
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    right: 16,
    top: 6,
    bottom: 6,
    width: 80,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteBackgroundText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    minHeight: 80,
  },
  queueItemCurrent: {
    backgroundColor: '#2A2A2A',
    borderLeftWidth: 3,
    borderLeftColor: '#1DB954',
  },
  queueItemActive: {
    opacity: 0.8,
  },
  dragHandle: {
    marginRight: 12,
    padding: 4,
  },
  dragHandleIcon: {
    fontSize: 20,
    color: '#666',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
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
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  songNameCurrent: {
    color: '#1DB954',
  },
  artistName: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#FF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 24,
  },
});