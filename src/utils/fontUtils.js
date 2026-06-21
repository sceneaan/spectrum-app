import i18next from 'i18next';

// Font mapping for Cairo (Arabic) and Inter (English)
// Note: Ensure these fonts are linked in the project (android/app/src/main/assets/fonts & Info.plist)
const fontMapping = {
  cairo: {
    thin: 'Cairo-ExtraLight',
    light: 'Cairo-Light',
    regular: 'Cairo-Regular',
    medium: 'Cairo-Medium',
    semibold: 'Cairo-SemiBold',
    bold: 'Cairo-Bold',
    extrabold: 'Cairo-ExtraBold',
    black: 'Cairo-Black',
  },
  inter: {
    thin: 'Inter_18pt-Thin',
    light: 'Inter_18pt-Light',
    regular: 'Inter_18pt-Regular',
    medium: 'Inter_18pt-Medium',
    semibold: 'Inter_18pt-SemiBold',
    bold: 'Inter_18pt-Bold',
    extrabold: 'Inter_18pt-ExtraBold',
    black: 'Inter_18pt-Black',
  },
};

export const getFont = (weight = 'regular') => {
  const currentLanguage = i18next.language || 'en';
  const fontSet = currentLanguage === 'ar' ? fontMapping.cairo : fontMapping.inter;
  return fontSet[weight] || fontSet.regular;
};

export const getFontStyle = (weight = 'regular', fontSize = 14, lineHeight = null, letterSpacing = 0) => {
  return {
    fontFamily: getFont(weight),
    fontSize,
  };
};

export const getTextVariantStyle = (variant, size) => {
  const variantMap = {
    display: {
      small: getFontStyle('regular', 18, 46),
      medium: getFontStyle('medium', 22, 52),
      large: getFontStyle('bold', 54, 64),
    },
    headline: {
      small: getFontStyle('medium', 20, 52),
      medium: getFontStyle('semibold', 24, 48),
      large: getFontStyle('bold', 26, 64),
    },
    title: {
      small: getFontStyle('medium', 12, 35, 0.1),
      medium: getFontStyle('semibold', 14, 34, 0.15),
      large: getFontStyle('medium', 16, 32),
    },
    body: {
      small: getFontStyle('regular', 10, 22, 0.4),
      medium: getFontStyle('regular', 11, 28, 0.25),
      large: getFontStyle('regular', 14, 24, 0.15),
    },
    label: {
      small: getFontStyle('regular', 12, 16, 0.9),
      medium: getFontStyle('medium', 14, 16, 0.5),
      large: getFontStyle('bold', 16, 26, 0.1),
    },
    description: {
      small: getFontStyle('regular', 12, null, 0.9),
      medium: getFontStyle('medium', 14, null, 0.5),
      large: getFontStyle('bold', 16, null, 0.1),
    },
  };

  return variantMap[variant]?.[size] || getFontStyle('regular', 14);
};

export const getCommonFonts = () => {
  return {
    regular: getFont('regular'),
    medium: getFont('medium'),
    bold: getFont('bold'),
    semibold: getFont('semibold'),
    light: getFont('light'),
    extralight: getFont('thin'),
    extrabold: getFont('extrabold'),
    black: getFont('black'),
  };
};

export const getUseCaseStyle = (useCase) => {
  const useCaseMap = {
    button: getFontStyle('medium', 16, 24),
    input: getFontStyle('regular', 14, 20),
    caption: getFontStyle('regular', 12, 16),
    error: getFontStyle('medium', 12, 16),
    success: getFontStyle('medium', 12, 16),
    link: getFontStyle('medium', 14, 20),
  };

  return useCaseMap[useCase] || getFontStyle('regular', 14);
};

export default {
  getFont,
  getFontStyle,
  getTextVariantStyle,
  getCommonFonts,
  getUseCaseStyle,
};