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

export const RATING = {
  MIN: 0.01,
  MAX: 5.0,
  DEFAULT_PRICE_COEFF: 0.6,
  DEFAULT_PARAMS_COEFF: 0.4,
  WEIGHT_MULTIPLIER: { LOW: 1, MEDIUM: 2, HIGH: 3 } as const,
} as const;

export const TICKET_TOPIC_CONFIG: Record<
  string,
  { section: string; smReviewRequired: boolean; defaultPoints: number }
> = {
  PARK_CHECK: { section: "TAXI_CHECK", smReviewRequired: true, defaultPoints: 150 },
  USER_BASE_CHECK: { section: "CHAT", smReviewRequired: true, defaultPoints: 0 },
  TAXI_CONNECT: { section: "CHAT", smReviewRequired: true, defaultPoints: 150 },
  BUYOUT: { section: "BUYOUT", smReviewRequired: false, defaultPoints: 0 },
  LEGAL: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
  FRIENDSHIP_POINTS: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
  OTHER: { section: "CHAT", smReviewRequired: false, defaultPoints: 0 },
};
