import { Module } from '@nestjs/common';
import { CataloghiService } from './cataloghi.service';
import { CataloghiPublicController } from './cataloghi-public.controller';
import { CataloghiAdminService } from './cataloghi-admin.service';
import { CataloghiAdminController } from './cataloghi-admin.controller';
import { BrevoService } from './brevo.service';

@Module({
  controllers: [CataloghiPublicController, CataloghiAdminController],
  providers: [CataloghiService, CataloghiAdminService, BrevoService],
})
export class CataloghiModule {}
