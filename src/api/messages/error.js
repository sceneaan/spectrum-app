import { ErrorMessages } from './generic';

export const throwServerError = error => {
  const serverError = error.response?.data;

  console.log('throwServerError - Full error:', error);
  console.log('throwServerError - Server error:', serverError);
  console.log('throwServerError - Error response:', error.response);

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
