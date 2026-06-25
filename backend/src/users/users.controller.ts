import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
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
import type { UserFilter } from '../common/filters';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('users')
@UseGuards(AuthenticatedGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission('admin.users.view')
  list(
    @Query('q') q?: string,
    @Query('stato') stato?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const validStati: UserFilter[] = ['ATTIVO', 'BLOCCATO', 'ELIMINATO', 'TUTTI'];
    return this.users.list({
      q,
      stato: validStati.includes(stato as UserFilter) ? (stato as UserFilter) : undefined,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    });
  }

  @Get(':id')
  @RequirePermission('admin.users.view')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.users.getById(id);
    if (!user) throw new NotFoundException('users.not_found');
    return user;
  }

  @Post()
  @RequirePermission('admin.users.create')
  create(@Body() dto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.create(req.user.id, dto, req.ip);
  }

  @Patch(':id')
  @RequirePermission('admin.users.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.update(req.user.id, id, dto, req.ip);
  }

  @Post(':id/block')
  @HttpCode(200)
  @RequirePermission('admin.users.block')
  block(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.users.setBlocked(req.user.id, id, true, req.ip);
  }

  @Post(':id/unblock')
  @HttpCode(200)
  @RequirePermission('admin.users.block')
  unblock(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.setBlocked(req.user.id, id, false, req.ip);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermission('admin.users.edit')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.users.resetPassword(req.user.id, id, req.ip);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission('admin.users.block')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.users.softDelete(req.user.id, id, req.ip);
    return user;
  }
}
