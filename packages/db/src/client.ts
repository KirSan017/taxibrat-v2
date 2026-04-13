import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as usersSchema from "./schema/users";
import * as sessionsSchema from "./schema/sessions";
import * as verificationCodesSchema from "./schema/verification-codes";
import * as managerSettingsSchema from "./schema/manager-settings";
import * as auditLogSchema from "./schema/audit-log";
import * as notificationsSchema from "./schema/notifications";

const schema = {
  ...usersSchema,
  ...sessionsSchema,
  ...verificationCodesSchema,
  ...managerSettingsSchema,
  ...auditLogSchema,
  ...notificationsSchema,
};

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
