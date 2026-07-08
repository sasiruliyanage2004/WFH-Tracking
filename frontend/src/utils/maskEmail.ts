export const maskEmail = (email: string | null | undefined): string => {
  if (!email || !email.includes('@')) return email || '';

  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    // If local part is very short (e.g. a@gmail.com, ab@gmail.com)
    return `${localPart[0]}***@${domain}`;
  }

  // Masking standard emails: keep first character, mask the rest until the @
  const maskedLocal = `${localPart[0]}***`;
  
  return `${maskedLocal}@${domain}`;
};
