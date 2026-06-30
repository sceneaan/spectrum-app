import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGlassTabBarInset } from './GlassShellTabBar';

export default function useGlassTabBarInset(extra = 0) {
  const insets = useSafeAreaInsets();
  return getGlassTabBarInset(insets) + extra;
}
