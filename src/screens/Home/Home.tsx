import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchSongs } from '../../services/api';
import { useSearchStore } from '../../store/searchStore';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { SongListItem } from '../../components/SongListItem';
import { debounce } from '../../utils/debounce';
import type { Song } from '../../types/api';

const ITEMS_PER_PAGE = 20;

export const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  const { setSearchQuery: setSearchStoreQuery, setSearchResults, setIsSearching: setSearchStoreIsSearching } = useSearchStore();
  const { queue } = usePlayerStore();
  const { playSong } = useAudioPlayerActions();
  const searchInputRef = useRef<TextInput>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, page: number = 1) => {
      if (!query || query.trim().length === 0) {
        setSongs([]);
        setSearchResults([]);
        setError(null);
        setHasMore(false);
        return;
      }

      try {
        setIsLoading(page === 1);
        if (page === 1) {
          setSearchStoreIsSearching(true);
        }
        setError(null);

        const response = await searchSongs(query.trim(), page);

        if (response.status === 'SUCCESS' || response.status === 'success') {
          const results = response.data.results || [];

          if (page === 1) {
            setSongs(results);
            setSearchResults(results);
          } else {
            setSongs((prev) => {
              const newSongs = [...prev, ...results];
              setSearchResults(newSongs);
              return newSongs;
            });
          }

          setTotalResults(response.data.total || results.length);
          setHasMore(results.length >= ITEMS_PER_PAGE);
          setCurrentPage(page);
        } else {
          throw new Error(response.message || 'Search failed');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search songs';
        setError(errorMessage);
        if (page === 1) {
          setSongs([]);
          setSearchResults([]);
        }
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        if (page === 1) {
          setSearchStoreIsSearching(false);
        }
      }
    }, 500),
    []
  );

  // Handle search query change
  useEffect(() => {
    setSearchStoreQuery(searchQuery);
    setCurrentPage(1);
    setHasMore(true);
    debouncedSearch(searchQuery, 1);
  }, [searchQuery, debouncedSearch, setSearchStoreQuery]);

  // Load more songs
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && searchQuery.trim().length > 0) {
      debouncedSearch(searchQuery, currentPage + 1);
    }
  }, [isLoading, hasMore, searchQuery, currentPage, debouncedSearch]);

  // Handle pull to refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    debouncedSearch(searchQuery, 1);
  }, [searchQuery, debouncedSearch]);

  // Handle song press
  const handleSongPress = useCallback(
    (song: Song) => {
      playSong(song);
      Keyboard.dismiss();
    },
    [playSong]
  );

  // Render song item
  const renderSongItem = useCallback(
    ({ item }: { item: Song }) => (
      <SongListItem song={item} onPress={handleSongPress} />
    ),
    [handleSongPress]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return null; // Loading indicator will be shown separately
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>⚠️</Text>
          <Text style={styles.emptyStateTitle}>Error</Text>
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => debouncedSearch(searchQuery, 1)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🎵</Text>
          <Text style={styles.emptyStateTitle}>Search for Music</Text>
          <Text style={styles.emptyStateText}>
            Search for your favorite songs, artists, or albums
          </Text>
        </View>
      );
    }

    if (songs.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>
            Try searching for something else
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!isLoading || currentPage === 1) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#1DB954" />
      </View>
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>MusicPlayer</Text>
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              searchInputRef.current?.blur();
            }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {searchQuery.trim().length > 0 && totalResults > 0 && (
        <Text style={styles.resultsCount}>
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={songs}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          songs.length === 0 && styles.listContentEmpty,
        ]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#1DB954"
            colors={['#1DB954']}
          />
        }
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />
      {/* Global loading indicator */}
      {isLoading && currentPage === 1 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#121212',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
  },
  resultsCount: {
    fontSize: 14,
    color: '#B3B3B3',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
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
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1DB954',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#B3B3B3',
  },
});

