import { useMemo } from 'react';
import { useWindowDimensions, PixelRatio } from 'react-native';

/** Shortest side >= 600dp → large phone / small tablet */
export const TABLET_BREAKPOINT = 600;
/** Shortest side >= 768dp → tablet / unfolded foldable */
export const LARGE_TABLET_BREAKPOINT = 768;

export const CONTENT_MAX_WIDTH = 720;
export const NARROW_FORM_MAX_WIDTH = 480;
export const WIDE_CONTENT_MAX_WIDTH = 960;

export const isTabletWidth = (width, height) =>
  Math.min(width, height) >= TABLET_BREAKPOINT;

export const isLargeTabletWidth = (width, height) =>
  Math.min(width, height) >= LARGE_TABLET_BREAKPOINT;

export const getContentMaxWidth = (width, height) => {
  if (!isTabletWidth(width, height)) return width;
  if (isLargeTabletWidth(width, height)) return WIDE_CONTENT_MAX_WIDTH;
  return CONTENT_MAX_WIDTH;
};

export const getGridItemWidth = (containerWidth, columns, gap = 12) => {
  const totalGap = gap * Math.max(columns - 1, 0);
  return (containerWidth - totalGap) / columns;
};

export const gridColumnsForWidth = (width, height, phoneCols = 4, tabletCols = 6) =>
  isTabletWidth(width, height) ? tabletCols : phoneCols;

/**
 * Live dimensions — updates on rotation, fold, and split-screen.
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = isTabletWidth(width, height);
    const isLargeTablet = isLargeTabletWidth(width, height);
    const contentWidth = getContentMaxWidth(width, height);
    const shortestSide = Math.min(width, height);
    const horizontalPadding = isTablet ? 24 : 20;
    const innerWidth = Math.min(width, contentWidth) - horizontalPadding * 2;

    return {
      width,
      height,
      fontScale,
      isTablet,
      isLargeTablet,
      contentWidth,
      horizontalPadding,
      innerWidth,
      /** FlatList / grid column count helpers */
      listColumns: isTablet ? 2 : 1,
      issueColumns: gridColumnsForWidth(width, height, 4, 8),
      quickActionColumns: isTablet ? 6 : 3,
      providerColumns: isTablet ? 3 : 0, // 0 = horizontal slider on phone
    };
  }, [width, height, fontScale]);
}

export const wp = (widthPercent, screenWidth) =>
  PixelRatio.roundToNearestPixel((screenWidth * parseFloat(widthPercent)) / 100);

export const hp = (heightPercent, screenHeight) =>
  PixelRatio.roundToNearestPixel((screenHeight * parseFloat(heightPercent)) / 100);
