import { useRoute, useNavigation } from '@react-navigation/native';

/**
 * Tab roots use profile header; stack-pushed screens use back.
 * Tab screens are registered as SearchTab, HomeTab, etc.
 */
export const useScreenHeaderMode = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const tabRoots = new Set(['HomeTab', 'SearchTab', 'AppointmentsTab', 'InboxTab']);
  const isTabRoot = tabRoots.has(route.name);

  return {
    isTabRoot,
    showBack: !isTabRoot && navigation.canGoBack(),
    showProfile: isTabRoot,
    onBack: () => navigation.goBack(),
  };
};

export default useScreenHeaderMode;
