import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import type { AuthenticatedRequest } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { CreateRaccoltaDto } from './dto/create-raccolta.dto';
import { UpdateRaccoltaDto } from './dto/update-raccolta.dto';
import { UpdateFamigliaDto } from './dto/update-famiglia.dto';

@Controller('admin')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ── Gruppi di permessi ──

  @Get('groups')
  @RequirePermission('admin.permissions.view')
  listGroups() {
    return this.admin.listGroups();
  }

  @Get('groups/:id')
  @RequirePermission('admin.permissions.view')
  getGroup(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getGroup(id);
  }

  @Post('groups')
  @RequirePermission('admin.permissions.edit')
  createGroup(@Body() dto: CreateGroupDto, @Req() req: AuthenticatedRequest) {
    return this.admin.createGroup(dto, req.user.id, req.ip);
  }

  @Put('groups/:id')
  @RequirePermission('admin.permissions.edit')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.updateGroup(id, dto, req.user.id, req.ip);
  }

  @Delete('groups/:id')
  @HttpCode(204)
  @RequirePermission('admin.permissions.edit')
  async deleteGroup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.admin.deleteGroup(id, req.user.id, req.ip);
  }

  // ── Lista utenti (admin panel) ──

  @Get('users')
  @RequirePermission('admin.permissions.view')
  listUsers(
    @Query('q') q?: string,
    @Query('stato') stato?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const validStati = ['ATTIVO', 'BLOCCATO', 'ELIMINATO', 'TUTTI'] as const;
    return this.admin.listAllUsers({
      q,
      stato: validStati.includes(stato as any) ? (stato as any) : undefined,
      page: Math.max(1, page),
      pageSize: Math.min(100, Math.max(1, pageSize)),
    });
  }

  // ── Permessi utente ──

  @Get('users/:id/permissions')
  @RequirePermission('admin.permissions.view')
  getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getUserPermissions(id);
  }

  @Put('users/:id/permissions')
  @RequirePermission('admin.permissions.edit')
  updateUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.updateUserPermissions(id, dto, req.user.id, req.ip);
  }

  @Put('users/:id/group')
  @RequirePermission('admin.permissions.edit')
  assignUserGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body('groupId') groupId: number | null,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.assignUserGroup(id, groupId, req.user.id, req.ip);
  }

  // ── Configurazioni sito ──

  @Get('config')
  @RequirePermission('admin.settings.view')
  listConfig() {
    return this.admin.listConfig();
  }

  @Put('config/:key')
  @RequirePermission('admin.settings.edit')
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.admin.updateConfig(key, value, req.user.id, req.ip);
    return { ok: true };
  }

  // ── Famiglie (read-only da Integra) ──

  @Get('famiglie')
  @RequirePermission('catalog.famiglie.view')
  listFamiglie() {
    return this.admin.listFamiglie();
  }

  @Patch('famiglie/:codice')
  @RequirePermission('catalog.famiglie.edit')
  updateFamiglia(
    @Param('codice') codice: string,
    @Body() dto: UpdateFamigliaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.updateFamiglia(codice, dto, req.user.id, req.ip);
  }

  @Post('famiglie/:codice/image')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('catalog.famiglie.edit')
  uploadFamigliaImage(
    @Param('codice') codice: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.admin.uploadFamigliaImage(codice, file);
  }

  // ── Raccolte ──

  @Get('raccolte')
  @RequirePermission('catalog.raccolte.view')
  listRaccolte() {
    return this.admin.listRaccolte();
  }

  @Get('raccolte/:id')
  @RequirePermission('catalog.raccolte.view')
  getRaccolta(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getRaccolta(id);
  }

  @Post('raccolte')
  @RequirePermission('catalog.raccolte.edit')
  createRaccolta(@Body() dto: CreateRaccoltaDto, @Req() req: AuthenticatedRequest) {
    return this.admin.createRaccolta(dto, req.user.id, req.ip);
  }

  @Put('raccolte/:id')
  @RequirePermission('catalog.raccolte.edit')
  updateRaccolta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRaccoltaDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.updateRaccolta(id, dto, req.user.id, req.ip);
  }

  @Delete('raccolte/:id')
  @HttpCode(204)
  @RequirePermission('catalog.raccolte.edit')
  async deleteRaccolta(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.admin.deleteRaccolta(id, req.user.id, req.ip);
  }

  // ── Articoli in una Raccolta ──

  @Put('raccolte/:id/articoli')
  @RequirePermission('catalog.raccolte.edit')
  setRaccoltaArticoli(
    @Param('id', ParseIntPipe) id: number,
    @Body('articoliIds') articoliIds: number[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.admin.setRaccoltaArticoli(id, articoliIds, req.user.id, req.ip);
  }

  @Post('raccolte/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission('catalog.raccolte.edit')
  uploadRaccoltaImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.admin.uploadRaccoltaImage(id, file);
  }
}
