import i18next from 'i18next';

/**
 * RTL Utility functions for handling Right-to-Left layouts
 * This file provides utilities to automatically adjust flexDirection and textAlignments
 * based on the current language (Arabic vs English)
 */

/**
 * Get the current language from i18next
 * @returns {string} 'ar' for Arabic, 'en' for English
 */
export const getCurrentLanguage = () => {
  return i18next.language || 'en';
};

/**
 * Check if the current language is RTL (Arabic)
 * @param {string} currentLang - Current language to check (optional)
 * @returns {boolean} true if RTL, false if LTR
 */
export const isRTL = (currentLang = null) => {
  const lang = currentLang || getCurrentLanguage();
  // Strictly enforce: Arabic = RTL (true), English = LTR (false)
  return lang === 'ar';
};

/**
 * Get flexDirection based on current language
 * @param {string} ltrDirection - Direction for LTR languages (default: 'row')
 * @param {string} rtlDirection - Direction for RTL languages (default: 'row-reverse')
 * @param {string} currentLang - Current language to check (optional)
 * @returns {string} flexDirection value
 */
export const rtlFlexDirection = (ltrDirection = 'row', rtlDirection = 'row-reverse', currentLang = null) => {
  return isRTL(currentLang) ? rtlDirection : ltrDirection;
};

/**
 * Get text alignment based on current language
 * @param {string} ltrAlign - Alignment for LTR languages (default: 'left')
 * @param {string} rtlAlign - Alignment for RTL languages (default: 'right')
 * @param {string} currentLang - Current language to check (optional)
 * @returns {'left' | 'right' | 'center' | 'justify'} textAlign value
 */
export const rtlTextAlign = (ltrAlign = 'left', rtlAlign = 'right', currentLang = null) => {
  return isRTL(currentLang) ? rtlAlign : ltrAlign;
};

/**
 * Get flexDirection for horizontal layouts
 * @param {string} currentLang - Current language to check (optional)
 * @returns {'row' | 'row-reverse'} 'row' for LTR, 'row-reverse' for RTL
 */
export const rtlRow = (currentLang = null) => rtlFlexDirection('row', 'row-reverse', currentLang);

/**
 * Get flexDirection for horizontal layouts (alternative)
 * @param {string} currentLang - Current language to check (optional)
 * @returns {'row' | 'row-reverse'} 'row' for LTR, 'row-reverse' for RTL
 */
export const rtlHorizontal = (currentLang = null) => rtlFlexDirection('row', 'row-reverse', currentLang);

/**
 * Get flexDirection for vertical layouts
 * @returns {'column'} 'column' for both LTR and RTL
 */
export const rtlColumn = () => 'column';

/**
 * Get flexDirection for vertical layouts (alternative)
 * @returns {'column'} 'column' for both LTR and RTL
 */
export const rtlVertical = () => 'column';

/**
 * Get text alignment for left-aligned text
 * @param {string} currentLang - Current language to check (optional)
 * @returns {'left' | 'right'} 'left' for LTR, 'right' for RTL
 */
export const rtlLeft = (currentLang = null) => rtlTextAlign('left', 'right', currentLang);

/**
 * Get text alignment for right-aligned text
 * @param {string} currentLang - Current language to check (optional)
 * @returns {'right' | 'left'} 'right' for LTR, 'left' for RTL
 */
export const rtlRight = (currentLang = null) => rtlTextAlign('right', 'left', currentLang);

/**
 * Get text alignment for center-aligned text
 * @returns {'center'} 'center' for both LTR and RTL
 */
export const rtlCenter = () => 'center';

/**
 * Get text alignment for justify-aligned text
 * @returns {'justify'} 'justify' for both LTR and RTL
 */
export const rtlJustify = () => 'justify';

/**
 * Get margin/padding start based on current language
 * @param {number|string} ltrValue - Value for LTR languages
 * @param {number|string} rtlValue - Value for RTL languages
 * @returns {number|string} marginStart or paddingStart value
 */
export const rtlStart = (ltrValue, rtlValue) => {
  return isRTL() ? rtlValue : ltrValue;
};

/**
 * Get margin/padding end based on current language
 * @param {number|string} ltrValue - Value for LTR languages
 * @param {number|string} rtlValue - Value for RTL languages
 * @returns {number|string} marginEnd or paddingEnd value
 */
export const rtlEnd = (ltrValue, rtlValue) => {
  return isRTL() ? rtlValue : ltrValue;
};

/**
 * Get position left/right based on current language
 * @param {number|string} ltrValue - Value for LTR languages
 * @param {number|string} rtlValue - Value for RTL languages
 * @returns {number|string} left or right position value
 */
export const rtlPosition = (ltrValue, rtlValue) => {
  return isRTL() ? rtlValue : ltrValue;
};

/**
 * Get transform scaleX based on current language
 * @returns {number} 1 for LTR, -1 for RTL
 */
export const rtlScaleX = () => {
  return isRTL() ? -1 : 1;
};

/**
 * Get transform scaleX for specific elements that need to be flipped
 * @param {number} ltrScale - Scale for LTR languages (default: 1)
 * @param {number} rtlScale - Scale for RTL languages (default: -1)
 * @returns {number} scaleX value
 */
export const rtlScaleXCustom = (ltrScale = 1, rtlScale = -1) => {
  return isRTL() ? rtlScale : ltrScale;
};

/**
 * Get border radius for RTL-aware corners
 * @param {number} topLeft - Top-left radius
 * @param {number} topRight - Top-right radius
 * @param {number} bottomLeft - Bottom-left radius
 * @param {number} bottomRight - Bottom-right radius
 * @returns {object} border radius object
 */
export const rtlBorderRadius = (topLeft, topRight, bottomLeft, bottomRight) => {
  if (isRTL()) {
    return {
      borderTopLeftRadius: topRight,
      borderTopRightRadius: topLeft,
      borderBottomLeftRadius: bottomRight,
      borderBottomRightRadius: bottomLeft,
    };
  }
  return {
    borderTopLeftRadius: topLeft,
    borderTopRightRadius: topRight,
    borderBottomLeftRadius: bottomLeft,
    borderBottomRightRadius: bottomRight,
  };
};

/**
 * Get margin object with RTL-aware start/end values
 * @param {number|string} start - Start margin value
 * @param {number|string} end - End margin value
 * @param {number|string} top - Top margin value
 * @param {number|string} bottom - Bottom margin value
 * @param {string} currentLang - Current language to check (optional)
 * @returns {object} margin object
 */
export const rtlMargin = (start, end, top = 0, bottom = 0, currentLang = null) => {
  if (isRTL(currentLang)) {
    return {
      marginLeft: end,
      marginRight: start,
      marginTop: top,
      marginBottom: bottom,
    };
  }
  return {
    marginLeft: start,
    marginRight: end,
    marginTop: top,
    marginBottom: bottom,
  };
};

/**
 * Get padding object with RTL-aware start/end values
 * @param {number|string} start - Start padding value
 * @param {number|string} end - End padding value
 * @param {number|string} top - Top padding value
 * @param {number|string} bottom - Bottom padding value
 * @param {string} currentLang - Current language to check (optional)
 * @returns {object} padding object
 */
export const rtlPadding = (start, end, top = 0, bottom = 0, currentLang = null) => {
  if (isRTL(currentLang)) {
    return {
      paddingLeft: end,
      paddingRight: start,
      paddingTop: top,
      paddingBottom: bottom,
    };
  }
  return {
    paddingLeft: start,
    paddingRight: end,
    paddingTop: top,
    paddingBottom: bottom,
  };
};

/**
 * Get position object with RTL-aware left/right values
 * @param {number|string} left - Left position value
 * @param {number|string} right - Right position value
 * @param {number|string} top - Top position value
 * @param {number|string} bottom - Bottom position value
 * @param {string} currentLang - Current language to check (optional)
 * @returns {object} position object
 */
export const rtlPositionAbsolute = (left, right, top = 0, bottom = 0, currentLang = null) => {
  if (isRTL(currentLang)) {
    return {
      position: 'absolute',
      left: right,
      right: left,
      top,
      bottom,
    };
  }
  return {
    position: 'absolute',
    left,
    right,
    top,
    bottom,
  };
};

/**
 * Get transform array with RTL-aware scaleX
 * @param {array} additionalTransforms - Additional transforms to apply
 * @returns {array} transform array
 */
export const rtlTransform = (additionalTransforms = []) => {
  const baseTransform = [{ scaleX: rtlScaleX() }];
  return [...baseTransform, ...additionalTransforms];
};

/**
 * Get justifyContent flex-start based on current language
 * @param {string} ltrValue - Value for LTR languages (default: 'flex-start')
 * @param {string} rtlValue - Value for RTL languages (default: 'flex-end')
 * @param {string} currentLang - Current language to check (optional)
 * @returns {string} justifyContent value
 */
export const rtlJustifyStart = (ltrValue = 'flex-start', rtlValue = 'flex-end', currentLang = null) => {
  return isRTL(currentLang) ? rtlValue : ltrValue;
};

/**
 * Get justifyContent flex-end based on current language
 * @param {string} ltrValue - Value for LTR languages (default: 'flex-end')
 * @param {string} rtlValue - Value for RTL languages (default: 'flex-start')
 * @returns {string} justifyContent value
 */
export const rtlJustifyEnd = (ltrValue = 'flex-end', rtlValue = 'flex-start') => {
  return isRTL() ? rtlValue : ltrValue;
};

/**
 * Get justifyContent flex-start (shorthand for rtlJustifyStart)
 * @returns {string} 'flex-start' for LTR, 'flex-end' for RTL
 */
export const rtlJustifyStartShort = () => rtlJustifyStart();

/**
 * Get justifyContent flex-end (shorthand for rtlJustifyEnd)
 * @returns {string} 'flex-end' for LTR, 'flex-start' for RTL
 */
export const rtlJustifyEndShort = () => rtlJustifyEnd();

/**
 * Get justifyContent center (always center)
 * @returns {string} 'center' for both LTR and RTL
 */
export const rtlJustifyCenter = () => 'center';

/**
 * Get justifyContent space-between (always space-between)
 * @returns {string} 'space-between' for both LTR and RTL
 */
export const rtlJustifyBetween = () => 'space-between';

/**
 * Get justifyContent space-around (always space-around)
 * @returns {string} 'space-around' for both LTR and RTL
 */
export const rtlJustifyAround = () => 'space-around';

/**
 * Get justifyContent space-evenly (always space-evenly)
 * @returns {string} 'space-evenly' for both LTR and RTL
 */
export const rtlJustifyEvenly = () => 'space-evenly';

/**
 * Get common RTL styles object
 * @returns {object} Common RTL styles
 */
export const getCommonRTLStyles = () => ({
  flexDirection: rtlRow(),
  textAlign: rtlLeft(),
});

/**
 * Get RTL-aware flex styles
 * @param {string} direction - 'row', 'column', 'row-reverse', 'column-reverse'
 * @returns {object} Flex styles object
 */
export const getRTLFlexStyles = (direction = 'row') => {
  if (direction === 'row') {
    return { flexDirection: rtlRow() };
  } else if (direction === 'column') {
    return { flexDirection: rtlColumn() };
  }
  return { flexDirection: direction };
};

/**
 * Get RTL-aware text styles
 * @param {string} alignment - 'left', 'right', 'center', 'justify'
 * @returns {object} Text styles object
 */
export const getRTLTextStyles = (alignment = 'left') => {
  if (alignment === 'left') {
    return { textAlign: rtlLeft() };
  } else if (alignment === 'right') {
    return { textAlign: rtlRight() };
  }
  return { textAlign: alignment };
};

/**
 * Get RTL-aware justifyContent styles
 * @param {string} alignment - 'start', 'end', 'center', 'between', 'around', 'evenly'
 * @returns {object} JustifyContent styles object
 */
export const getRTLJustifyStyles = (alignment = 'start') => {
  switch (alignment) {
    case 'start':
      return { justifyContent: rtlJustifyStart() };
    case 'end':
      return { justifyContent: rtlJustifyEnd() };
    case 'center':
      return { justifyContent: rtlJustifyCenter() };
    case 'between':
      return { justifyContent: rtlJustifyBetween() };
    case 'around':
      return { justifyContent: rtlJustifyAround() };
    case 'evenly':
      return { justifyContent: rtlJustifyEvenly() };
    default:
      return { justifyContent: alignment };
  }
};

/**
 * Validate RTL configuration and log current state
 * @returns {object} Current RTL configuration
 */
export const validateRTLConfig = () => {
  const currentLang = getCurrentLanguage();
  const rtlStatus = isRTL();

  return {
    currentLanguage: currentLang,
    isRTL: rtlStatus,
    expectedBehavior: currentLang === 'ar' ? 'Right-to-Left' : 'Left-to-Right',
  };
};

/**
 * Get strict RTL styles with validation
 * @param {string} currentLang - Current language to validate
 * @returns {object} Strict RTL styles object
 */
export const getStrictRTLStyles = (currentLang = null) => {
  const lang = currentLang || getCurrentLanguage();
  const rtl = lang === 'ar';

  return {
    flexDirection: rtl ? 'row-reverse' : 'row',
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
    direction: rtl ? 'rtl' : 'ltr',
    // Add validation
    _validation: {
      language: lang,
      isRTL: rtl,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Force strict RTL behavior - this ensures no ambiguity
 * @param {string} currentLang - Current language to enforce
 * @returns {object} Strict RTL configuration object
 */
export const forceStrictRTL = (currentLang = null) => {
  const lang = currentLang || getCurrentLanguage();

  // Strict enforcement: Arabic = RTL, English = LTR, no exceptions
  const strictConfig = {
    language: lang,
    isRTL: lang === 'ar',
    isLTR: lang === 'en',
    flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
    textAlign: lang === 'ar' ? 'right' : 'left',
    justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start',
    marginStart: lang === 'ar' ? 'marginRight' : 'marginLeft',
    marginEnd: lang === 'ar' ? 'marginLeft' : 'marginRight',
    paddingStart: lang === 'ar' ? 'paddingRight' : 'paddingLeft',
    paddingEnd: lang === 'ar' ? 'paddingLeft' : 'paddingRight',
  };

  return strictConfig;
};

/**
 * Get RTL-safe flex direction that guarantees correct behavior
 * @param {string} currentLang - Current language to check
 * @returns {string} Guaranteed correct flex direction
 */
export const getGuaranteedFlexDirection = (currentLang = null) => {
  const lang = currentLang || getCurrentLanguage();

  // This function guarantees the correct flex direction
  if (lang === 'ar') {
    return 'row-reverse'; // Arabic = RTL = row-reverse
  } else {
    return 'row'; // English = LTR = row
  }
};

/**
 * Get RTL-safe text alignment that guarantees correct behavior
 * @param {string} currentLang - Current language to check
 * @returns {string} Guaranteed correct text alignment
 */
export const getGuaranteedTextAlign = (currentLang = null) => {
  const lang = currentLang || getCurrentLanguage();

  // This function guarantees the correct text alignment
  if (lang === 'ar') {
    return 'right'; // Arabic = RTL = right aligned
  } else {
    return 'left'; // English = LTR = left aligned
  }
};

/**
 * Hook to get RTL-aware styles
 * @returns {object} Object with RTL utility functions
 */
export const useRTL = () => ({
  isRTL: isRTL(),
  rtlFlexDirection,
  rtlTextAlign,
  rtlRow,
  rtlColumn,
  rtlLeft,
  rtlRight,
  rtlCenter,
  rtlStart,
  rtlEnd,
  rtlPosition,
  rtlScaleX,
  rtlMargin,
  rtlPadding,
  rtlPositionAbsolute,
  rtlTransform,
  // JustifyContent utilities
  rtlJustifyStart,
  rtlJustifyEnd,
  rtlJustifyCenter,
  rtlJustifyBetween,
  rtlJustifyAround,
  rtlJustifyEvenly,
  rtlJustifyStartShort,
  rtlJustifyEndShort,
  getCommonRTLStyles,
  getRTLFlexStyles,
  getRTLTextStyles,
  getRTLJustifyStyles,
  // Validation utilities
  validateRTLConfig,
  getStrictRTLStyles,
  forceStrictRTL,
  getGuaranteedFlexDirection,
  getGuaranteedTextAlign,
});
