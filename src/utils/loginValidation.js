import { validatePhone } from '../components/common/PhoneInput';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSaudiPhone(localDigits) {
  const clean = (localDigits || '').replace(/\D/g, '');
  return `+966${clean}`;
}

export function validateLoginEmail(email, t) {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return t('auth.login.emailRequired') || 'Please enter your email';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return t('auth.login.invalidEmail') || 'Please enter a valid email';
  }
  return '';
}

export function validateLoginPhone(localPhone, t) {
  const clean = (localPhone || '').replace(/\D/g, '');
  if (!clean) {
    return t('auth.login.phoneRequired') || 'Please enter your phone number';
  }
  const { isValid } = validatePhone(clean, '+966');
  if (!isValid) {
    return t('auth.login.invalidPhone') || 'Invalid phone number';
  }
  return '';
}
