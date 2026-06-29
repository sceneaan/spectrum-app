/** Patient profile completion — matches web `profileCompletion.js`. */
export function calculatePatientProfileCompletion(user) {
  if (!user) return 0;

  const requiredFields = [
    { key: 'fullName', value: user.fullName },
    { key: 'email', value: user.email },
    { key: 'phone', value: user.phone },
    { key: 'dob', value: user.dob },
    { key: 'gender', value: user.gender },
    { key: 'nationality', value: user.nationality },
    { key: 'profileImage', value: user.profileImage || user.profileImageFileId },
    { key: 'nationalId', value: user.nationalId },
    { key: 'emergencyContactName', value: user.emergencyContact?.name },
    { key: 'emergencyContactPhone', value: user.emergencyContact?.phone },
    { key: 'history', value: user.history },
    { key: 'preferredLanguage', value: user.preferredLanguage },
  ];

  const isSaudiPhone = user.phone?.startsWith('+966') || user.phone?.startsWith('966');
  if (user.residencyType === 'KSA' || (user.residencyType === 'GLOBAL_ELM_OFF' && isSaudiPhone)) {
    requiredFields.push({
      key: 'isPhoneVerified',
      value: user.isPhoneVerified === true ? true : null,
    });
  }

  requiredFields.push({
    key: 'isEmailVerified',
    value: user.isEmailVerified === true ? true : null,
  });

  const filledFields = requiredFields.filter((field) => {
    const val = field.value;
    if (val === null || val === undefined) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  return Math.round((filledFields / requiredFields.length) * 100);
}
