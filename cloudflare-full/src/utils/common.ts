export function generateId(): string {
  return crypto.randomUUID();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeContent(content: string): string {
  // Basic HTML sanitization - remove script tags and other dangerous elements
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function formatDate(date: Date | string, timezoneOffset: number = 0): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const offsetMs = timezoneOffset * 60 * 1000;
  const adjustedDate = new Date(d.getTime() + offsetMs);
  
  return adjustedDate.toISOString().slice(0, 16).replace('T', ' ');
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export class HTTPException extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HTTPException';
  }
}