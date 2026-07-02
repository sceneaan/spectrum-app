import moment from 'moment';

export function formatMobileActivityDate(value) {
  if (!value) return null;
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : null;
}

export function getMobileActivityLines(item, labels = {}) {
  const activity = item.mobileActivity || {};
  const hasMobileApp = activity.hasMobileApp
    || (Array.isArray(item.mobileDevices) && item.mobileDevices.length > 0)
    || item.hasPushToken === true;

  const lastLogin = formatMobileActivityDate(activity.lastLoginAt || item.lastLoginAt);
  const lastActive = formatMobileActivityDate(activity.lastActiveAt || item.lastActiveAt);
  const platform = activity.platform
    ? `${activity.platform}${activity.appVersion ? ` v${activity.appVersion}` : ''}`
    : null;

  const lines = [];

  if (hasMobileApp) {
    lines.push(
      platform
        ? `${labels.mobileApp || 'Mobile app'}: ${platform}`
        : (labels.mobileAppInstalled || 'Mobile app installed'),
    );
  } else {
    lines.push(labels.noMobileApp || 'No mobile app activity');
  }

  if (lastLogin) {
    lines.push(`${labels.lastLogin || 'Last login'}: ${lastLogin}`);
  }

  if (lastActive) {
    lines.push(`${labels.lastActive || 'Last active'}: ${lastActive}`);
  }

  return lines;
}
