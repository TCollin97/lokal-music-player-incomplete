import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MiniPlayer } from '../components/MiniPlayer';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import type { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Custom Tab Bar with MiniPlayer integration
 */
export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const stackNavigation = useNavigation<NavigationProp>();

  const handleMiniPlayerPress = () => {
    stackNavigation.navigate('Player');
  };

  return (
    <View style={styles.container}>
      {/* MiniPlayer positioned above tabs */}
      <MiniPlayer onPress={handleMiniPlayerPress} />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const getIcon = () => {
            switch (route.name) {
              case 'Home':
                return isFocused ? '🏠' : '🏡';
              case 'Search':
                return isFocused ? '🔍' : '🔎';
              case 'Library':
                return isFocused ? '📚' : '📖';
              default:
                return '•';
            }
          };

          const icon = getIcon();

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <Text style={styles.tabIcon}>{icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#121212',
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1DB954',
    fontWeight: '600',
  },
});

