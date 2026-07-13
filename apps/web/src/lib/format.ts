import type { MoneyValue } from '@/types/domain';

export function toNumber(value: MoneyValue | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === 'number' ? value : Number(value);
}

export function formatCurrency(value: MoneyValue | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(toNumber(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function sentenceCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
