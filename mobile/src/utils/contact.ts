import { Linking } from 'react-native';

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

// Numeros brasileiros cadastrados sem DDI (10 ou 11 digitos) recebem o 55.
function withCountryCode(phone: string) {
  const digits = digitsOnly(phone);
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function formatPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

export function openWhatsApp(phone: string, message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return Linking.openURL(`https://wa.me/${withCountryCode(phone)}${text}`);
}

export function callPhone(phone: string) {
  return Linking.openURL(`tel:${digitsOnly(phone)}`);
}

export function sendEmail(email: string) {
  return Linking.openURL(`mailto:${email}`);
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}
