const format = (user, value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  
  // Convert to number and round to 10 decimal places to fix floating point precision issues
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) {
    return value;
  }
  
  // Round to 10 decimal places to eliminate floating point artifacts
  const roundedValue = Math.round(numValue * 10000000000) / 10000000000;
  
  // Convert to string to handle decimal replacement
  let stringValue = roundedValue.toString();
  
  if (user.excel_decimal && user.excel_decimal !== ".") {
    // Replace the decimal point with the user's preferred separator
    stringValue = stringValue.replace(".", user.excel_decimal);
  }
  
  return stringValue;
};

module.exports = { format };
