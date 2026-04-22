export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  return /^[0-9+\-\s()]{6,20}$/.test(value.trim());
}

export function isPassword(value: string): boolean {
  return value.length >= 6;
}

export function isIdCard(value: string): boolean {
  return value.trim().length >= 4;
}

export function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
