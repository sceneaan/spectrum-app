import React, { useState } from 'react';
import { Image } from 'react-native';
import ICONS from '../constants/icons';

const ProviderThumb = ({ uri, style, resizeMode = 'cover' }) => {
  const [failed, setFailed] = useState(false);
  const useFallback = failed || !uri;

  return (
    <Image
      source={useFallback ? ICONS.defaultAvatar : { uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
};

export default ProviderThumb;
