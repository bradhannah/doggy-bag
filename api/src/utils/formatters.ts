// Formatters - Currency and date formatting utilities

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number') {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatCentsToDollars(cents: number): string {
  return formatCurrency(cents / 100);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatMonth(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long'
  }).format(date);
}

export function formatMonthString(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  return formatMonth(year, month);
}

export function parseCurrency(value: string): number {
  if (!value || typeof value !== 'string') {
    return 0;
  }
  
  const cleaned = value
    .replace(/[^0-9.-]/g, '')
    .replace(/^\./, '0.')
    .replace(/\.$/, '');
  
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

export function parseCurrencyToCents(value: string): number {
  return Math.round(parseCurrency(value) * 100);
}
