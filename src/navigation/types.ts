import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Navigation param lists for type-safe navigation
 */

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Player: undefined;
  Queue: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

