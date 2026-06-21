import { postRequest } from '../index';

const MODEL_NAME = '/elm';

/**
 * Verify identity using ELM/Yakeen API
 * ID type is auto-detected from first digit (1=Saudi NIN, 2=Iqama)
 * @param {string} nationalId - National ID (starts with 1) or Iqama (starts with 2) - 10 digits
 * @param {string} dateOfBirth - Date of birth (any format - backend converts to YYYY-MM)
 * @returns {Promise<Object>} Verification result with user data:
 *   - fullName: Combined "Arabic / English" name
 *   - fullNameAr: Arabic name only
 *   - fullNameEn: English name only
 *   - gender: 'male' or 'female'
 *   - nationality: Country name
 *   - birthDateG: Gregorian birth date
 *   - birthDateH: Hijri birth date
 *   - idType: 'nin' or 'iqama'
 */
export const verifyElmIdentity = async (nationalId, dateOfBirth) => {
  try {
    const response = await postRequest(`${MODEL_NAME}/verify`, {
      nationalId,
      dateOfBirth,
    });

    if (response.status === 200 && response.data.success) {
      return { success: true, data: response.data.data };
    } else {
      return { success: false, message: response.data?.message || 'Verification failed' };
    }
  } catch (error) {
    // Extract error message from backend response
    const errorMessage = error.response?.data?.message || error.message || 'Identity verification failed';
    return { success: false, message: errorMessage };
  }
};
