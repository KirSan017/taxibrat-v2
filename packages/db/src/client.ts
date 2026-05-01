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
import * as ticketsSchema from "./schema/tickets";
import * as ticketMessagesSchema from "./schema/ticket-messages";
import * as ticketBufferSchema from "./schema/ticket-buffer";
import * as pointsTransactionsSchema from "./schema/points-transactions";
import * as serviceSettingsSchema from "./schema/service-settings";
import * as newsSchema from "./schema/news";
import * as buyoutListingsSchema from "./schema/buyout-listings";
import * as no9OrdersSchema from "./schema/no9-orders";
import * as referralEventsSchema from "./schema/referral-events";

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
  ...ticketsSchema,
  ...ticketMessagesSchema,
  ...ticketBufferSchema,
  ...pointsTransactionsSchema,
  ...serviceSettingsSchema,
  ...newsSchema,
  ...buyoutListingsSchema,
  ...no9OrdersSchema,
  ...referralEventsSchema,
};

export function createDb(url: string) {
  // Supabase pooler в session mode ограничен 15 соединениями.
  // Держим пул узким + быстро отпускаем idle-коннекты, чтобы не упереться в EMAXCONNSESSION.
  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    prepare: false,
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
