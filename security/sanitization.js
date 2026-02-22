import validator from 'validator';

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validateMobileNumber = (mobile) => {
  return validator.isMobilePhone(mobile, 'any');
};

export const validateURL = (url) => {
  return validator.isURL(url);
};
