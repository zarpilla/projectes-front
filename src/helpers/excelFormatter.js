const format = (user, value) => {
  if (user.excel_decimal && user.excel_decimal !== ".") {
    return value.toString().replace(".", user.excel_decimal);
  } else {
    return value;
  }
};

module.exports = { format };
