import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { PointsModule } from "./modules/points/points.module";
import { UsersModule } from "./modules/users/users.module";
import { ManagersModule } from "./modules/managers/managers.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { RatingModule } from "./modules/rating/rating.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { ParksModule } from "./modules/parks/parks.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { NewsModule } from "./modules/news/news.module";
import { BuyoutModule } from "./modules/buyout/buyout.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ReferralsModule } from "./modules/referrals/referrals.module";
import { StatsModule } from "./modules/stats/stats.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
    AuthModule,
    SettingsModule,
    PointsModule,
    UsersModule,
    ManagersModule,
    NotificationsModule,
    AuditModule,
    RatingModule,
    BrandsModule,
    ParksModule,
    CatalogModule,
    TicketsModule,
    NewsModule,
    BuyoutModule,
    OrdersModule,
    ReferralsModule,
    StatsModule,
  ],
})
export class AppModule {}
