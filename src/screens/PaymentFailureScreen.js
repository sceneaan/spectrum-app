import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ICONS from '../constants/icons';
import COLORS from '../constants/colors';

const PaymentFailureScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { error } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
            source={ICONS.errorCircle}
            style={styles.icon}
        />
        <Text style={styles.title}>{t('paymentFailure.title') || 'Payment Failed'}</Text>
        <Text style={styles.subtitle}>{error || t('paymentFailure.subtitle') || "Something went wrong with your transaction. Please try again."}</Text>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>{t('paymentFailure.tryAgain') || 'Try Again'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Main')}>
            <Text style={styles.secondaryBtnText}>{t('paymentFailure.goToHome') || 'Go to Home'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  icon: { width: 100, height: 100, tintColor: COLORS.danger, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 },

  btn: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, marginBottom: 15, width: '80%', alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  
  secondaryBtn: { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '80%', alignItems: 'center' },
  secondaryBtnText: { color: COLORS.gray600, fontSize: 16, fontWeight: '600' }
});

export default PaymentFailureScreen;
