import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../../constants/colors';

const PRIMARY_COLOR = '#65bed6';

const DeviceOption = ({ device, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[styles.deviceOption, isSelected && styles.deviceOptionSelected]}
    onPress={() => onSelect(device.deviceId)}
    activeOpacity={0.7}
  >
    <View style={styles.deviceInfo}>
      <Text style={[styles.deviceLabel, isSelected && styles.deviceLabelSelected]}>
        {device.label || device.deviceName || `Device ${device.deviceId?.slice(0, 8)}`}
      </Text>
    </View>
    {isSelected && (
      <Icon name="check-circle" size={22} color={PRIMARY_COLOR} />
    )}
  </TouchableOpacity>
);

const SettingsModal = ({
  visible,
  onClose,
  audioDevices = [],
  videoDevices = [],
  selectedAudioDevice,
  selectedVideoDevice,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onApplySettings,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t('video_conference.settings_title', 'Settings')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Microphone Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="mic" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.sectionTitle}>
                  {t('video_conference.microphone', 'Microphone')}
                </Text>
              </View>
              {audioDevices.length > 0 ? (
                audioDevices.map((device) => (
                  <DeviceOption
                    key={device.deviceId}
                    device={device}
                    isSelected={selectedAudioDevice === device.deviceId}
                    onSelect={onSelectAudioDevice}
                  />
                ))
              ) : (
                <Text style={styles.noDevicesText}>
                  {t('video_conference.no_microphones', 'No microphones found')}
                </Text>
              )}
            </View>

            {/* Camera Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="videocam" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.sectionTitle}>
                  {t('video_conference.camera', 'Camera')}
                </Text>
              </View>
              {videoDevices.length > 0 ? (
                videoDevices.map((device) => (
                  <DeviceOption
                    key={device.deviceId}
                    device={device}
                    isSelected={selectedVideoDevice === device.deviceId}
                    onSelect={onSelectVideoDevice}
                  />
                ))
              ) : (
                <Text style={styles.noDevicesText}>
                  {t('video_conference.no_cameras', 'No cameras found')}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={onApplySettings}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>
                {t('video_conference.apply_settings', 'Apply Settings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deviceOptionSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(101, 190, 214, 0.1)',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 14,
    color: '#475569',
  },
  deviceLabelSelected: {
    color: '#1E293B',
    fontWeight: '500',
  },
  noDevicesText: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  applyButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsModal;
