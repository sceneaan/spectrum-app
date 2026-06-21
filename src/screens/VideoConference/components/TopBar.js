import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import COLORS from '../../../constants/colors';

const PRIMARY_COLOR = '#65bed6';

const TopBar = ({
  callDuration,
  sessionTimeRemaining,
  participantCount,
  connectionQuality,
  layout,
  onLayoutChange,
  isRTL = false,
}) => {
  const { t } = useTranslation();

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'Excellent':
      case 'Good':
        return '#22C55E';
      case 'Fair':
        return '#F59E0B';
      case 'Poor':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'Excellent':
        return 'signal-cellular-4-bar';
      case 'Good':
        return 'signal-cellular-alt';
      case 'Fair':
        return 'signal-cellular-alt-2-bar';
      case 'Poor':
        return 'signal-cellular-alt-1-bar';
      default:
        return 'signal-cellular-null';
    }
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Left Section - Call Duration */}
      <View style={styles.leftSection}>
        <View style={styles.durationContainer}>
          <View style={styles.liveDot} />
          <Text style={styles.durationText}>{callDuration}</Text>
        </View>
      </View>

      {/* Center Section - Time Remaining & Participants */}
      <View style={styles.centerSection}>
        {sessionTimeRemaining && (
          <View style={styles.timeRemainingContainer}>
            <Icon name="schedule" size={14} color="#F59E0B" />
            <Text style={styles.timeRemainingText}>{sessionTimeRemaining}</Text>
          </View>
        )}
        <View style={styles.participantContainer}>
          <Icon name="people" size={14} color="white" />
          <Text style={styles.participantText}>{participantCount}</Text>
        </View>
      </View>

      {/* Right Section - Quality & Layout */}
      <View style={styles.rightSection}>
        {/* Connection Quality */}
        <View style={styles.qualityContainer}>
          <Icon name={getQualityIcon()} size={16} color={getQualityColor()} />
          <Text style={[styles.qualityText, { color: getQualityColor() }]}>
            {connectionQuality}
          </Text>
        </View>

        {/* Layout Toggle - Speaker/Gallery */}
        <TouchableOpacity
          style={styles.layoutButton}
          onPress={() => onLayoutChange(layout === 'speaker' ? 'gallery' : 'speaker')}
        >
          <Icon
            name={layout === 'speaker' ? 'grid-view' : 'person'}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    marginBottom: 12,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  durationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  timeRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeRemainingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  participantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  participantText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  layoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TopBar;
