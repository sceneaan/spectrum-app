import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import COLORS from '../../constants/colors';

/**
 * Shell UI icons — single family + weight (Material Community outline/filled).
 * Use instead of mixed PNGs for tabs, quick actions, and other chrome.
 */
export const SHELL_ICONS = {
  home: { outline: 'home-outline', filled: 'home' },
  doctors: { outline: 'magnify', filled: 'magnify' },
  // `calendar` / `video` are solid glyphs — closer optical weight to magnify + email-outline
  calendar: { outline: 'calendar', filled: 'calendar-check' },
  inbox: { outline: 'email-outline', filled: 'email' },
  search: 'magnify',
  video: 'video',
  shield: 'shield-check-outline',
  verified: 'certificate-outline',
  lock: 'lock-outline',
  bell: { outline: 'bell-outline', filled: 'bell' },
  back: 'chevron-left',
};

/** Quick-action row — icons picked for matched visual weight */
export const QUICK_ACTION_ICONS = {
  search: SHELL_ICONS.search,
  calendar: SHELL_ICONS.calendar.outline,
  inbox: SHELL_ICONS.inbox.outline,
  video: SHELL_ICONS.video,
  wallet: 'wallet-outline',
  performance: 'chart-line',
  practice: 'clipboard-text-outline',
  approvals: 'calendar-clock',
  refills: 'pill',
  videoWeb: 'monitor-lock',
};

export default function AppIcon({
  name,
  size = 24,
  color = COLORS.textPrimary,
  focused = false,
  pair,
}) {
  const resolvedName = pair
    ? (focused ? pair.filled : pair.outline)
    : name;

  if (!resolvedName) return null;

  return (
    <MaterialCommunityIcons
      name={resolvedName}
      size={size}
      color={color}
    />
  );
}
