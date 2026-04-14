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

export enum TicketTopic {
  PARK_CHECK = "PARK_CHECK",
  USER_BASE_CHECK = "USER_BASE_CHECK",
  TAXI_CONNECT = "TAXI_CONNECT",
  BUYOUT = "BUYOUT",
  LEGAL = "LEGAL",
  FRIENDSHIP_POINTS = "FRIENDSHIP_POINTS",
  OTHER = "OTHER",
}

export enum TicketStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING_SM_REVIEW = "PENDING_SM_REVIEW",
  SM_REJECTED = "SM_REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum RelatedEntityType {
  PARK = "PARK",
  PARK_CLASS = "PARK_CLASS",
  VEHICLE = "VEHICLE",
  USER = "USER",
}

export enum PointsTransactionType {
  REGISTRATION = "REGISTRATION",
  PARK_CHECK = "PARK_CHECK",
  TAXI_CONNECT = "TAXI_CONNECT",
  BUYOUT = "BUYOUT",
  REFERRAL = "REFERRAL",
  ORDER_NO9 = "ORDER_NO9",
  ORDER_CANCEL = "ORDER_CANCEL",
  BASE_CHECK = "BASE_CHECK",
  MANUAL_ADMIN = "MANUAL_ADMIN",
  IDEA = "IDEA",
}

export enum BuyoutOwnerType {
  INDIVIDUAL = "INDIVIDUAL",
  LEGAL_ENTITY = "LEGAL_ENTITY",
  TAXI_PARK = "TAXI_PARK",
  BANK = "BANK",
}

export enum BuyoutStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum No9OrderStatus {
  PENDING = "PENDING",
  ORDERED = "ORDERED",
  BANNED = "BANNED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum ReferralEventType {
  REGISTRATION = "REGISTRATION",
  RENTAL = "RENTAL",
  BUYOUT = "BUYOUT",
}
