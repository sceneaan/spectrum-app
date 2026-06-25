import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { request, PERMISSIONS, RESULTS, check, openSettings } from 'react-native-permissions';

export async function checkSessionMediaPermissions() {
  if (Platform.OS === 'android') {
    const camera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    const mic = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return { camera, microphone: mic, allGranted: camera && mic };
  }

  const camera = await check(PERMISSIONS.IOS.CAMERA);
  const mic = await check(PERMISSIONS.IOS.MICROPHONE);
  return {
    camera: camera === RESULTS.GRANTED,
    microphone: mic === RESULTS.GRANTED,
    allGranted: camera === RESULTS.GRANTED && mic === RESULTS.GRANTED,
  };
}

export async function requestSessionMediaPermissions(t) {
  if (Platform.OS === 'android') {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    const camera = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const microphone = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    return { camera, microphone, allGranted: camera && microphone };
  }

  const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
  const micResult = await request(PERMISSIONS.IOS.MICROPHONE);
  const camera = cameraResult === RESULTS.GRANTED;
  const microphone = micResult === RESULTS.GRANTED;
  return { camera, microphone, allGranted: camera && microphone };
}

export function showMediaPermissionAlert(t, onOpenSettings) {
  Alert.alert(
    t?.sessionPrep?.permissionsTitle || 'Camera & microphone needed',
    t?.sessionPrep?.permissionsBody || 'Video sessions need camera and microphone access. Enable them in Settings to join.',
    [
      { text: t?.common?.cancel || 'Cancel', style: 'cancel' },
      {
        text: t?.sessionPrep?.openSettings || 'Open Settings',
        onPress: () => {
          openSettings().catch(() => {});
          onOpenSettings?.();
        },
      },
    ],
  );
}

export function buildVideoSessionParams({ appointment, user }) {
  const roomId = appointment?.roomId || appointment?.meetingRoomId;
  const userId = user?.id || user?._id;
  return {
    meetingRoomId: roomId,
    userID: userId ? String(userId) : undefined,
    userName: user?.fullName || user?.fullNameArabic || appointment?.patient?.fullName || 'Patient',
  };
}
