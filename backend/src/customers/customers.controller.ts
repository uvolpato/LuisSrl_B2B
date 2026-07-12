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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { InvitaBulkDto } from './dto/invita-bulk.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('customers')
@UseGuards(AuthenticatedGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission('admin.users.view')
  list(
    @Query('q') q?: string,
    @Query('stato') stato?: 'ATTIVO' | 'BLOCCATO',
    @Query('invitato') invitato?: 'si' | 'no',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('sort') sort?: string,
    @Query('dir') dir?: 'asc' | 'desc',
  ) {
    return this.customers.list({
      q,
      stato: stato === 'ATTIVO' || stato === 'BLOCCATO' ? stato : undefined,
      invitato: invitato === 'si' || invitato === 'no' ? invitato : undefined,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
      sort,
      dir,
    });
  }

  @Get(':id')
  @RequirePermission('admin.users.view')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const c = await this.customers.getById(id);
    if (!c) throw new NotFoundException('customers.not_found');
    return c;
  }

  @Get(':id/indirizzi')
  @RequirePermission('admin.users.view')
  async getIndirizzi(@Param('id', ParseIntPipe) id: number) {
    return this.customers.getIndirizzi(id);
  }

  @Get(':id/contatti')
  @RequirePermission('admin.users.view')
  async getContatti(@Param('id', ParseIntPipe) id: number) {
    return this.customers.getContatti(id);
  }

  @Get(':id/ordini')
  @RequirePermission('admin.users.view')
  async getOrdini(
    @Param('id', ParseIntPipe) id: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('year') year?: string,
  ) {
    return this.customers.getOrdini(id, search, Number(page) || 1, Math.min(Number(limit) || 50, 200), sortBy, sortDir, year);
  }

  @Post()
  @RequirePermission('admin.users.create')
  create(@Body() dto: CreateCustomerDto, @Req() req: AuthenticatedRequest) {
    return this.customers.create(req.user.id, dto, req.ip);
  }

  @Patch(':id')
  @RequirePermission('admin.users.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customers.update(req.user.id, id, dto, req.ip);
  }

  @Post(':id/block')
  @HttpCode(200)
  @RequirePermission('admin.users.block')
  block(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.customers.setBlocked(req.user.id, id, true, req.ip);
  }

  @Post(':id/unblock')
  @HttpCode(200)
  @RequirePermission('admin.users.block')
  unblock(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customers.setBlocked(req.user.id, id, false, req.ip);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermission('admin.users.edit')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customers.resetPassword(req.user.id, id, req.ip);
  }

  @Post(':id/invita')
  @HttpCode(200)
  @RequirePermission('admin.users.edit')
  invita(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.customers.invita(req.user.id, id, req.ip);
  }

  @Post('invita-bulk')
  @HttpCode(200)
  @RequirePermission('admin.users.edit')
  invitaBulk(@Body() dto: InvitaBulkDto, @Req() req: AuthenticatedRequest) {
    return this.customers.invitaBulk(req.user.id, dto.customerIds, req.ip);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission('admin.users.delete')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customers.deleteCustomer(req.user.id, id, req.ip);
  }
}
