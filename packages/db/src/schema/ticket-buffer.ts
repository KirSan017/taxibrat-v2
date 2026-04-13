import {
  pgTable, uuid, timestamp,
} from "drizzle-orm/pg-core";
import { tickets } from "./tickets";
import { managerSectionEnum } from "./manager-settings";

export const ticketBuffer = pgTable("ticket_buffer", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id").notNull().unique().references(() => tickets.id, { onDelete: "cascade" }),
  section: managerSectionEnum("section").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
