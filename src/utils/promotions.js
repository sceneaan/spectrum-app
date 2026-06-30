const JUNK_PATTERN = /^(test|testing|rer|asdf|lorem|xxx|demo|sample|temp|abc|123|foo|bar|qwerty)$/i;

export function isMeaningfulPromoText(text, minLength = 5) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < minLength) return false;
  if (JUNK_PATTERN.test(trimmed)) return false;
  return true;
}

export function isDisplayablePromotion(promo) {
  if (!promo || promo.status === 'inactive') return false;
  if (promo.isCurated) return true;

  const titleOk = isMeaningfulPromoText(promo.titleEnglish, 8)
    || isMeaningfulPromoText(promo.titleArabic, 8)
    || isMeaningfulPromoText(promo.title, 8);
  const descOk = isMeaningfulPromoText(promo.descriptionEnglish, 15)
    || isMeaningfulPromoText(promo.descriptionArabic, 15)
    || isMeaningfulPromoText(promo.subtitle, 15)
    || isMeaningfulPromoText(promo.description, 15);

  return titleOk && descOk;
}

export function buildCuratedPromos(homeLocale = {}) {
  const items = homeLocale.curatedPromos || [];
  return items.map((item, index) => ({
    id: `curated-${index}`,
    isCurated: true,
    themeIndex: index,
    ctaAction: item.action || 'search',
    titleEnglish: item.titleEn,
    titleArabic: item.titleAr,
    descriptionEnglish: item.descEn,
    descriptionArabic: item.descAr,
    detailEnglish: item.detailEn,
    detailArabic: item.detailAr,
    ctaLabelEn: item.ctaEn,
    ctaLabelAr: item.ctaAr,
    status: 'active',
  }));
}

export function resolveHomePromoCards(apiPromos, homeLocale = {}) {
  const valid = (apiPromos || []).filter(isDisplayablePromotion);
  if (valid.length > 0) {
    return valid.map((promo, index) => ({
      ...promo,
      themeIndex: index,
      ctaAction: 'detail',
      ctaLabelEn: homeLocale.promoCtaDetails || 'View details',
      ctaLabelAr: homeLocale.promoCtaDetailsAr || 'عرض التفاصيل',
    }));
  }
  return buildCuratedPromos(homeLocale);
}

export function getPromoLocalizedFields(promo, isRTL) {
  const title = isRTL
    ? (promo.titleArabic || promo.titleEnglish || promo.title)
    : (promo.titleEnglish || promo.titleArabic || promo.title);
  const subtitle = isRTL
    ? (promo.descriptionArabic || promo.descriptionEnglish || promo.subtitle || promo.description)
    : (promo.descriptionEnglish || promo.descriptionArabic || promo.subtitle || promo.description);
  const ctaLabel = isRTL
    ? (promo.ctaLabelAr || promo.ctaLabelEn)
    : (promo.ctaLabelEn || promo.ctaLabelAr);
  const detailBody = isRTL
    ? (promo.detailArabic || promo.detailEnglish || subtitle)
    : (promo.detailEnglish || promo.detailArabic || subtitle);

  return { title, subtitle, ctaLabel, detailBody };
}

export function handlePromoAction(promo, navigation, Linking, Alert, linkErrorTitle) {
  const action = promo.ctaAction || 'detail';
  const externalUrl = promo.link || promo.url || promo.ctaUrl;

  if (action === 'search') {
    navigation.navigate('Main', { screen: 'SearchTab' });
    return;
  }

  if (action === 'external' && externalUrl) {
    Linking.canOpenURL(externalUrl)
      .then((supported) => {
        if (supported) return Linking.openURL(externalUrl);
        Alert.alert(linkErrorTitle || 'Unable to open link', externalUrl);
        return null;
      })
      .catch(() => Alert.alert(linkErrorTitle || 'Unable to open link', externalUrl));
    return;
  }

  navigation.navigate('PromoDetail', { promo });
}
