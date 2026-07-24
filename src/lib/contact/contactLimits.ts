export const CONTACT_BODY_LIMIT_BYTES = 16 * 1024;
export const CONTACT_FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 160,
  message: 5_000,
  companyWebsite: 200,
} as const;
