import {
  pgTable,
  uuid,
  pgEnum,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
  "USER",
  "PARK",
  "CAR",
  "TICKET",
  "POINTS",
]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: auditActionEnum("action").notNull(),
    entity: auditEntityEnum("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entity, table.entityId),
    index("audit_actor_idx").on(table.actorId),
    index("audit_created_idx").on(table.createdAt),
  ]
);
