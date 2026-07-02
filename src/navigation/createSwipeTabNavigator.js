import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import GlassShellTabBar, { createSwipeTabNavigatorOptions } from './GlassShellTabBar';

const MaterialTab = createMaterialTopTabNavigator();
const SWIPE_TAB_SCREEN_OPTIONS = createSwipeTabNavigatorOptions();

/**
 * Bottom glass tab bar + Instagram-style horizontal swipe between tabs.
 * Uses material-top-tabs (TabView + PagerView) with the tab bar pinned to the bottom.
 */
export default function createSwipeTabNavigator() {
  function SwipeTabNavigator({ children, screenListeners, ...rest }) {
    return (
      <MaterialTab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <GlassShellTabBar {...props} />}
        screenOptions={SWIPE_TAB_SCREEN_OPTIONS}
        screenListeners={screenListeners}
        {...rest}
      >
        {children}
      </MaterialTab.Navigator>
    );
  }

  SwipeTabNavigator.Navigator = SwipeTabNavigator;
  SwipeTabNavigator.Screen = MaterialTab.Screen;

  return SwipeTabNavigator;
}
