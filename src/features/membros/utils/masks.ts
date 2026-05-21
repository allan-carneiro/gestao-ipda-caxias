export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function maskCEP(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}