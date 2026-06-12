import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

/** Gestione clienti: solo amministratori. Ogni scrittura passa dalle SP. */
@Controller('users')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('stato') stato?: 'ATTIVO' | 'BLOCCATO',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.users.list({
      q,
      stato: stato === 'ATTIVO' || stato === 'BLOCCATO' ? stato : undefined,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    });
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.getById(id);
    if (!user) throw new NotFoundException('users.not_found');
    return user;
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.createCliente(req.user.id, dto, req.ip);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.update(req.user.id, id, dto, req.ip);
  }

  @Post(':id/block')
  @HttpCode(200)
  block(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.users.setBlocked(req.user.id, id, true, req.ip);
  }

  @Post(':id/unblock')
  @HttpCode(200)
  unblock(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.setBlocked(req.user.id, id, false, req.ip);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.resetPassword(req.user.id, id, req.ip);
  }
}
