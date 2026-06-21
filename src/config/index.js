
import { Platform } from 'react-native';
import config from './environment';

const IP = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';
// const IP = '192.168.1.8';

const PORT = '8000';

const devUrls = {
  api_url: `http://${IP}:${PORT}/api`,
  file_url: `http://${IP}:${PORT}`,
};

// Use environment configuration instead of hardcoded values
const prodUrls = {
  api_url: config.api_url,
  file_url: config.file_url,
  front_end: config.front_end,
};

// Select environment based on development/production
const environment = prodUrls;

export const environmentUrls = {
  ...environment,
};
