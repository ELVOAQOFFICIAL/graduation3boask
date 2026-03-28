/** Strip HTML tags and trim whitespace from user input */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/** Normalize text for comparison: lowercase, remove diacritics */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Mask email for logging: j***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}
