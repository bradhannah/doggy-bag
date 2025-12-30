// Validators - Input validation helpers

export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  
  if (typeof value === 'string' && !value.trim()) {
    return `${fieldName} cannot be blank`;
  }
  
  return null;
}

export function validateLength(value: string, min: number, max: number, fieldName: string): string | null {
  const trimmed = value.trim();
  
  if (trimmed.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  
  if (trimmed.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }
  
  return null;
}

export function validateAmount(value: number, fieldName: string = 'Amount'): string | null {
  if (typeof value !== 'number') {
    return `${fieldName} must be a number`;
  }
  
  if (isNaN(value)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (value <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  
  if (!Number.isInteger(value)) {
    return `${fieldName} must be an integer`;
  }
  
  if (value >= Number.MAX_SAFE_INTEGER) {
    return `${fieldName} is too large`;
  }
  
  return null;
}

export function validateEmail(value: string, fieldName: string = 'Email'): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(value)) {
    return `${fieldName} must be a valid email address`;
  }
  
  return null;
}

export function validateEnum<T extends string>(value: T, validValues: readonly T[], fieldName: string): string | null {
  if (!validValues.includes(value)) {
    return `${fieldName} must be one of: ${validValues.join(', ')}`;
  }
  
  return null;
}

export function validateUUID(value: string, fieldName: string = 'ID'): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    return `${fieldName} must be a valid UUID`;
  }
  
  return null;
}

export function validateDate(value: string | Date, fieldName: string = 'Date'): string | null {
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  
  return null;
}

export function validateMonth(value: string, fieldName: string = 'Month'): string | null {
  const monthRegex = /^\d{4}-\d{2}$/;
  
  if (!monthRegex.test(value)) {
    return `${fieldName} must be in YYYY-MM format`;
  }
  
  const [year, month] = value.split('-').map(Number);
  
  if (year < 1900 || year > 2100) {
    return `${fieldName} year must be between 1900 and 2100`;
  }
  
  if (month < 1 || month > 12) {
    return `${fieldName} month must be between 1 and 12`;
  }
  
  return null;
}
