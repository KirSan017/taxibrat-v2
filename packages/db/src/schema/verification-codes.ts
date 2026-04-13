import {
  pgTable,
  uuid,
  varchar,
  integer,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";

export const verificationMethodEnum = pgEnum("verification_method", [
  "SMS",
  "TELEGRAM",
]);

export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  method: verificationMethodEnum("method").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
