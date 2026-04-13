export enum UserRole {
  USER = "USER",
  MANAGER = "MANAGER",
  SUPER_MANAGER = "SUPER_MANAGER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  PHONE_VERIFIED = "PHONE_VERIFIED",
  PENDING_REVIEW = "PENDING_REVIEW",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  BANNED = "BANNED",
}

export enum VerificationMethod {
  SMS = "SMS",
  TELEGRAM = "TELEGRAM",
}

export enum ManagerSection {
  CHAT = "CHAT",
  TAXI_CHECK = "TAXI_CHECK",
  NO_9_PERCENT = "NO_9_PERCENT",
  USERS = "USERS",
  BUYOUT = "BUYOUT",
}

export enum WorkStatus {
  WORKING = "WORKING",
  RESTING = "RESTING",
}

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  STATUS_CHANGE = "STATUS_CHANGE",
}

export enum AuditEntity {
  USER = "USER",
  PARK = "PARK",
  CAR = "CAR",
  TICKET = "TICKET",
  POINTS = "POINTS",
}

export enum NotificationType {
  SYSTEM = "SYSTEM",
  TICKET = "TICKET",
  POINTS = "POINTS",
  NEWS = "NEWS",
}

export enum DriverClass {
  ECONOMY = "ECONOMY",
  COMFORT = "COMFORT",
  COMFORT_PLUS = "COMFORT_PLUS",
  BUSINESS = "BUSINESS",
  PREMIER = "PREMIER",
  ELITE = "ELITE",
}

export enum District {
  CAO = "CAO",
  SVAO = "SVAO",
  SAO = "SAO",
  SZAO = "SZAO",
  ZAO = "ZAO",
  UZAO = "UZAO",
  UAO = "UAO",
  UVAO = "UVAO",
  VAO = "VAO",
  MYTISCHI = "MYTISCHI",
  KRASNOGORSK = "KRASNOGORSK",
  DOLGOPRUDNY = "DOLGOPRUDNY",
  KHIMKI = "KHIMKI",
  ODINTSOVO = "ODINTSOVO",
  NOVOMOSKOVSKY = "NOVOMOSKOVSKY",
  BUTOVO = "BUTOVO",
  VIDNOE = "VIDNOE",
  LUBERTSY = "LUBERTSY",
  REUTOV = "REUTOV",
  BALASHIKHA = "BALASHIKHA",
}

export enum ParkStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum RatingWeightLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}
