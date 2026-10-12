// The value of a numeric column of a download: the number itself, untouched.
// The downloads are .ods files with numeric cells (see src/service/ods.js), so
// the "Decimal Excel" field of the user is no longer used (issues/032). `user`
// stays in the signature for the existing callers.
const format = (user, value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const numValue = value.trim() === '' ? NaN : Number(value);
    return isNaN(numValue) ? value : numValue;
  }
  return value;
};

export { format };
