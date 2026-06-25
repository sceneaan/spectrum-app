import {
  normalizeSaudiPhone,
  validateLoginEmail,
  validateLoginPhone,
} from '../../src/utils/loginValidation';
import { validatePhone } from '../../src/components/common/PhoneInput';

describe('loginValidation', () => {
  const t = (key) => key;

  describe('validateLoginPhone', () => {
    it('rejects empty phone', () => {
      expect(validateLoginPhone('', t)).toBe('auth.login.phoneRequired');
    });

    it('rejects non-Saudi mobile format', () => {
      expect(validateLoginPhone('412345678', t)).toBe('auth.login.invalidPhone');
    });

    it('accepts valid Saudi mobile', () => {
      expect(validateLoginPhone('512345678', t)).toBe('');
    });
  });

  describe('validateLoginEmail', () => {
    it('rejects empty email', () => {
      expect(validateLoginEmail('', t)).toBe('auth.login.emailRequired');
    });

    it('rejects invalid email', () => {
      expect(validateLoginEmail('not-an-email', t)).toBe('auth.login.invalidEmail');
    });

    it('accepts valid email', () => {
      expect(validateLoginEmail('user@example.com', t)).toBe('');
    });
  });

  describe('normalizeSaudiPhone', () => {
    it('builds E.164 Saudi number', () => {
      expect(normalizeSaudiPhone('512345678')).toBe('+966512345678');
    });
  });

  describe('validatePhone saudi rule', () => {
    it('matches frontend Saudi-only mobile rule', () => {
      expect(validatePhone('512345678', '+966').isValid).toBe(true);
      expect(validatePhone('412345678', '+966').isValid).toBe(false);
    });
  });
});
