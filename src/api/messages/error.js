import { ErrorMessages } from './generic';
import logger from '../../utils/logger';

export const throwServerError = error => {
  const serverError = error.response?.data;

  logger.debug('throwServerError - Full error:', error);
  logger.debug('throwServerError - Server error:', serverError);
  logger.debug('throwServerError - Error response:', error.response);

  if (serverError) {
    // Handle case where message is an object
    const message = typeof serverError.message === 'object'
      ? JSON.stringify(serverError.message)
      : serverError.message;
    throw new Error(message ?? ErrorMessages.generalMessage);
  } else {
    throw new Error(error.message ?? ErrorMessages.generalMessage);
  }
};
