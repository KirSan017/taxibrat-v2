import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as usersSchema from "./schema/users";
import * as sessionsSchema from "./schema/sessions";
import * as verificationCodesSchema from "./schema/verification-codes";
import * as managerSettingsSchema from "./schema/manager-settings";
import * as auditLogSchema from "./schema/audit-log";
import * as notificationsSchema from "./schema/notifications";
import * as carBrandsSchema from "./schema/car-brands";
import * as carModelsSchema from "./schema/car-models";
import * as taxiParksSchema from "./schema/taxi-parks";
import * as parkClassesSchema from "./schema/park-classes";
import * as parkVehiclesSchema from "./schema/park-vehicles";
import * as ratingWeightsSchema from "./schema/rating-weights";
import * as ratingConfigSchema from "./schema/rating-config";
import * as classRevenueSchema from "./schema/class-revenue";

const schema = {
  ...usersSchema,
  ...sessionsSchema,
  ...verificationCodesSchema,
  ...managerSettingsSchema,
  ...auditLogSchema,
  ...notificationsSchema,
  ...carBrandsSchema,
  ...carModelsSchema,
  ...taxiParksSchema,
  ...parkClassesSchema,
  ...parkVehiclesSchema,
  ...ratingWeightsSchema,
  ...ratingConfigSchema,
  ...classRevenueSchema,
};

export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
