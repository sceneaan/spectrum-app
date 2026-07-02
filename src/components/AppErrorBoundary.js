import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import COLORS from '../constants/colors';
import { navigationRef } from '../navigation/AppNavigator';
import { fullLogout } from '../utils/fullLogout';
import i18n from '../config/i18n';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info?.componentStack);
    // AppNavigator is now unmounted — its BootSplash safety timer was cleared.
    // Hide it here so users can see this error screen instead of being stuck on the logo.
    try { BootSplash.hide({ fade: false }); } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = async () => {
    this.setState({ hasError: false });
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  handleLogout = async () => {
    await fullLogout({ callServer: false });
    this.setState({ hasError: false });
    DeviceEventEmitter.emit('auth:sessionExpired');
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
          <Text style={styles.message}>{i18n.t('errorBoundary.message')}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>{i18n.t('errorBoundary.tryAgain')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={this.handleGoHome}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>{i18n.t('errorBoundary.goHome')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={this.handleLogout}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>{i18n.t('errorBoundary.signOut')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
});

export default AppErrorBoundary;
