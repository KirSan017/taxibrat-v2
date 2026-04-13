import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { Inject, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Database } from "@taxibrat/db";
import { tickets, users } from "@taxibrat/db";
import { MessagesService } from "./messages.service";

interface ChatUser {
  sub: string;
  role: string;
}

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private clientUsers = new Map<string, ChatUser>();

  constructor(
    private config: ConfigService,
    @Inject("DATABASE") private db: Database,
    private messagesService: MessagesService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) { client.disconnect(); return; }

      const payload = verify(token, this.config.get("JWT_SECRET")!) as ChatUser;
      this.clientUsers.set(client.id, payload);
      this.logger.log(`Chat: ${client.id} connected (user ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clientUsers.delete(client.id);
    this.logger.log(`Chat: ${client.id} disconnected`);
  }

  @SubscribeMessage("join-ticket")
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user) return;

    // Verify access
    const [ticket] = await this.db.select().from(tickets)
      .where(eq(tickets.id, data.ticketId)).limit(1);

    if (!ticket) return;

    const canAccess =
      user.role === "ADMIN" ||
      user.role === "SUPER_MANAGER" ||
      ticket.userId === user.sub ||
      ticket.assignedToId === user.sub;

    if (!canAccess) return;

    client.join(`ticket:${data.ticketId}`);
    this.logger.log(`User ${user.sub} joined ticket:${data.ticketId}`);
  }

  @SubscribeMessage("send-message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; body: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user || !data.body?.trim()) return;

    // Save to DB
    const message = await this.messagesService.create(data.ticketId, user.sub, data.body.trim());

    // Get sender info
    const [sender] = await this.db.select({
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    }).from(users).where(eq(users.id, user.sub)).limit(1);

    const senderName = sender?.firstName && sender?.lastName
      ? `${sender.firstName} ${sender.lastName.charAt(0)}.`
      : "Пользователь";

    // Broadcast to room
    this.server.to(`ticket:${data.ticketId}`).emit("new-message", {
      id: message.id,
      ticketId: data.ticketId,
      senderId: user.sub,
      senderName,
      senderRole: sender?.role || user.role,
      body: message.body,
      isSystem: false,
      createdAt: message.createdAt.toISOString(),
    });
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const user = this.clientUsers.get(client.id);
    if (!user) return;

    client.to(`ticket:${data.ticketId}`).emit("user-typing", {
      ticketId: data.ticketId,
      userId: user.sub,
    });
  }

  @SubscribeMessage("leave-ticket")
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.leave(`ticket:${data.ticketId}`);
  }

  // Called by TicketsService for system messages
  emitToTicket(ticketId: string, event: string, payload: unknown) {
    this.server.to(`ticket:${ticketId}`).emit(event, payload);
  }
}
