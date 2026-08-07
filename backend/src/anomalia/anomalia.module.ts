import { Module } from '@nestjs/common';
import { AnomaliaController } from './anomalia.controller';
import { AnomaliaFilter } from './anomalia.filter';
import { AnomaliaService } from './anomalia.service';

@Module({
  controllers: [AnomaliaController],
  providers: [AnomaliaService, AnomaliaFilter],
  exports: [AnomaliaService],
})
export class AnomaliaModule {}
