import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, JwtPayload } from "../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TicketsService } from "./tickets.service";
import { MessagesService } from "./messages.service";
import {
  UserRole, listTicketsSchema, sendMessageSchema, rejectTicketSchema, approveTicketSchema,
  ListTicketsDto, SendMessageDto, RejectTicketDto, ApproveTicketDto,
} from "@taxibrat/shared";

@Controller("admin/tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsAdminController {
  constructor(
    private ticketsService: TicketsService,
    private messagesService: MessagesService,
  ) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto,
  ) {
    // Admins and SMs see all tickets; regular managers only their own.
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_MANAGER) {
      return this.ticketsService.listAll(dto);
    }
    return this.ticketsService.listForManager(user.sub, dto);
  }

  @Get("review")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  listForReview(@Query(new ZodValidationPipe(listTicketsSchema)) dto: ListTicketsDto) {
    return this.ticketsService.listForSmReview(dto);
  }

  @Get(":id")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  async getById(@Param("id") id: string) {
    const ticket = await this.ticketsService.getById(id);
    await this.ticketsService.markInProgress(id);
    const messagesResult = await this.messagesService.listByTicket(id, 1, 50);
    const messages = [...messagesResult.data].reverse();
    return { ...ticket, messages };
  }

  @Post(":id/messages")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
  ) {
    return this.messagesService.create(id, user.sub, dto.body);
  }

  @Post(":id/close")
  @Roles(UserRole.MANAGER, UserRole.SUPER_MANAGER, UserRole.ADMIN)
  close(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.ticketsService.close(id, user.sub);
  }

  @Post(":id/approve")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  approve(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(approveTicketSchema)) dto: ApproveTicketDto,
  ) {
    return this.ticketsService.approve(id, user.sub, dto.pointsAwarded);
  }

  @Post(":id/reject")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  reject(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectTicketSchema)) dto: RejectTicketDto,
  ) {
    return this.ticketsService.reject(id, user.sub, dto.reason);
  }

  /**
   * Confirm that the user actually rented a taxi (ТЗ 632-633).
   * Awards a separate bonus (points_rental_confirmed, default 300),
   * in addition to the 150 awarded on ticket approval.
   */
  @Post(":id/confirm-rental")
  @Roles(UserRole.SUPER_MANAGER, UserRole.ADMIN)
  confirmRental(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return this.ticketsService.confirmRental(id, user.sub);
  }
}
