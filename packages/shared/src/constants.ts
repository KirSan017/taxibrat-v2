export const AUTH = {
  CODE_LENGTH: 6,
  CODE_TTL_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  ACCESS_TOKEN_TTL: "15m",
  REFRESH_TOKEN_TTL_DAYS: 90,
} as const;

export const POINTS = {
  REGISTRATION_BONUS: 100,
  DISPLAY_OFFSET: 615,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
