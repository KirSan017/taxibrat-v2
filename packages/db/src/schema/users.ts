import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  pgEnum,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "MANAGER",
  "SUPER_MANAGER",
  "ADMIN",
]);

export const userStatusEnum = pgEnum("user_status", [
  "PHONE_VERIFIED",
  "PENDING_REVIEW",
  "ACTIVE",
  "REJECTED",
  "BANNED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  patronymic: varchar("patronymic", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  birthDate: date("birth_date"),
  photoUrl: varchar("photo_url", { length: 500 }),
  role: userRoleEnum("role").notNull().default("USER"),
  status: userStatusEnum("status").notNull().default("PHONE_VERIFIED"),
  friendshipPoints: integer("friendship_points").notNull().default(0),
  successfulParkChecks: integer("successful_park_checks").notNull().default(0),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  referredById: uuid("referred_by_id").references((): AnyPgColumn => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
