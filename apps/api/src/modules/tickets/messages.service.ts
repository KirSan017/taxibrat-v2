import { Injectable, Inject } from "@nestjs/common";
import { eq, desc, sql } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { ticketMessages, users } from "@taxibrat/db";

@Injectable()
export class MessagesService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async create(ticketId: string, senderId: string, body: string, isSystem = false) {
    const [message] = await this.db
      .insert(ticketMessages)
      .values({ ticketId, senderId, body, isSystem })
      .returning();
    return message;
  }

  async createSystem(ticketId: string, systemUserId: string, body: string) {
    return this.create(ticketId, systemUserId, body, true);
  }

  async listByTicket(ticketId: string, page: number, limit: number) {
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: ticketMessages.id,
          ticketId: ticketMessages.ticketId,
          senderId: ticketMessages.senderId,
          senderFirstName: users.firstName,
          senderLastName: users.lastName,
          senderRole: users.role,
          body: ticketMessages.body,
          isSystem: ticketMessages.isSystem,
          createdAt: ticketMessages.createdAt,
        })
        .from(ticketMessages)
        .innerJoin(users, eq(ticketMessages.senderId, users.id))
        .where(eq(ticketMessages.ticketId, ticketId))
        .orderBy(desc(ticketMessages.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticketId)),
    ]);

    return {
      data: data.map((m) => ({
        ...m,
        senderName: m.senderFirstName && m.senderLastName
          ? `${m.senderFirstName} ${m.senderLastName.charAt(0)}.`
          : "Система",
      })),
      total: Number(countResult[0].count),
      page,
      limit,
    };
  }
}
