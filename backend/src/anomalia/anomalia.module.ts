import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AnomaliaController } from './anomalia.controller';
import { AnomaliaFilter } from './anomalia.filter';
import { AnomaliaService } from './anomalia.service';

@Module({
  controllers: [AnomaliaController],
  providers: [
    AnomaliaService,
    AnomaliaFilter,
    { provide: APP_FILTER, useClass: AnomaliaFilter },
  ],
  exports: [AnomaliaService],
})
export class AnomaliaModule {}
