/**
 * Safe fallback when FlatList.scrollToIndex fails (layout not measured yet).
 */
export function createScrollToIndexFailedHandler(flatListRef, itemLength) {
  return ({ index, averageItemLength }) => {
    const length = averageItemLength || itemLength;
    if (!length || !flatListRef?.current) return;
    flatListRef.current.scrollToOffset({
      offset: length * index,
      animated: true,
    });
  };
}
