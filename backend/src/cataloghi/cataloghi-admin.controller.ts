import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { CataloghiAdminService } from './cataloghi-admin.service';

class CreaMailingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome!: string;

  @IsArray()
  @IsInt({ each: true })
  cataloghi!: number[];

  @IsOptional()
  @IsIn(['email', 'link'])
  canale?: string;
}

class ImportClientiDto {
  @IsArray()
  @IsInt({ each: true })
  customerIds!: number[];
}

/** Area admin "Cataloghi": upload PDF, campagne mail, import contatti e tracking. */
@Controller('admin/cataloghi')
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission('marketing.cataloghi.view')
export class CataloghiAdminController {
  constructor(private readonly admin: CataloghiAdminService) {}

  // ── Cataloghi (PDF) ──

  @Post()
  @RequirePermission('marketing.cataloghi.edit')
  @UseInterceptors(FileInterceptor('file'))
  creaCatalogo(@Body('nome') nome: string, @UploadedFile() file: Express.Multer.File) {
    return this.admin.creaCatalogo(nome, file);
  }

  @Get()
  elencoCataloghi() {
    return this.admin.elencoCataloghi();
  }

  @Post(':id/archivia')
  @RequirePermission('marketing.cataloghi.edit')
  archiviaCatalogo(@Param('id', ParseIntPipe) id: number) {
    return this.admin.archiviaCatalogo(id);
  }

  @Post(':id/ripristina')
  @RequirePermission('marketing.cataloghi.edit')
  ripristinaCatalogo(@Param('id', ParseIntPipe) id: number) {
    return this.admin.ripristinaCatalogo(id);
  }

  // ── Mailing ──

  @Post('mailing')
  @RequirePermission('marketing.cataloghi.edit')
  creaMailing(@Body() dto: CreaMailingDto) {
    return this.admin.creaMailing(dto.nome, dto.cataloghi, dto.canale ?? 'email');
  }

  @Get('mailing')
  elencoMailing() {
    return this.admin.elencoMailing();
  }

  @Get('mailing/:id')
  dettaglioMailing(@Param('id', ParseIntPipe) id: number) {
    return this.admin.dettaglioMailing(id);
  }

  @Post('mailing/:id/import')
  @RequirePermission('marketing.cataloghi.edit')
  @UseInterceptors(FileInterceptor('file'))
  importContatti(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    return this.admin.importContatti(id, file);
  }

  @Post('mailing/:id/import-clienti')
  @RequirePermission('marketing.cataloghi.edit')
  importClienti(@Param('id', ParseIntPipe) id: number, @Body() dto: ImportClientiDto) {
    return this.admin.importClienti(id, dto.customerIds);
  }

  @Get('mailing/:id/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="catalogo.csv"')
  async exportCsv(@Param('id', ParseIntPipe) id: number) {
    return this.admin.exportCsv(id);
  }

  @Post('link/:id/revoca')
  @RequirePermission('marketing.cataloghi.edit')
  revocaLink(@Param('id', ParseIntPipe) id: number) {
    return this.admin.revocaLink(id);
  }

  @Post('mailing/:id/brevo')
  @RequirePermission('marketing.cataloghi.edit')
  inviaABrevo(@Param('id', ParseIntPipe) id: number) {
    return this.admin.inviaABrevo(id);
  }
}
