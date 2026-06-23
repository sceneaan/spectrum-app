import { Vibration, Platform } from 'react-native';

// Haptic feedback utility. On iOS, Vibration is silenced by the mute switch;
// for true haptic engine support on iOS install react-native-haptic-feedback.
const haptics = {
  light: () => {
    if (Platform.OS === 'android') Vibration.vibrate(12);
  },
  success: () => {
    if (Platform.OS === 'android') Vibration.vibrate([0, 12, 60, 12]);
    else Vibration.vibrate(10);
  },
  error: () => {
    if (Platform.OS === 'android') Vibration.vibrate([0, 50, 40, 50]);
    else Vibration.vibrate(40);
  },
  warning: () => {
    if (Platform.OS === 'android') Vibration.vibrate(30);
    else Vibration.vibrate(30);
  },
};

export default haptics;
