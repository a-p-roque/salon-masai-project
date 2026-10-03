export const formatPhoneNumber = (value) => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '').slice(0, 10);
  
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
};

export const cleanPhoneNumber = (value) => {
  return value.replace(/\D/g, '');
};