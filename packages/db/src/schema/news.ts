import {
  pgTable, uuid, varchar, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const news = pgTable(
  "news",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull(),
    linkUrl: varchar("link_url", { length: 500 }),
    isPublished: boolean("is_published").notNull().default(true),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("news_published_idx").on(table.isPublished, table.createdAt)]
);
