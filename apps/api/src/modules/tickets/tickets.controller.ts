import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TicketsService } from "./tickets.service";
import { MessagesService } from "./messages.service";
import {
  createTicketSchema, listTicketsSchema, sendMessageSchema,
  CreateTicketDto, ListTicketsDto, SendMessageDto,
} from "@taxibrat/shared";

@Controller("tickets")
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private messagesService: MessagesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createTicketSchema)) dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(user.sub, dto);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto,
  ) {
    return this.ticketsService.listForUser(user.sub, dto);
  }

  @Get(":id")
  async getById(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const ticket = await this.ticketsService.getById(id);
    const messagesResult = await this.messagesService.listByTicket(id, 1, 50);
    // listByTicket возвращает {data, total, ...} с DESC порядком; UI чата
    // ждёт массив от старых к новым.
    const messages = [...messagesResult.data].reverse();
    return { ...ticket, messages };
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ticketsService.cancel(id, user.sub);
  }

  @Post(":id/messages")
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.create(id, user.sub, dto.body);
  }

  @Get(":id/messages")
  listMessages(
    @Param("id") id: string,
    @Query("page") page = "1",
    @Query("limit") limit = "50",
  ) {
    return this.messagesService.listByTicket(id, parseInt(page), Math.min(parseInt(limit), 100));
  }
}
