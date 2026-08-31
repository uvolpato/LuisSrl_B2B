import { Module } from '@nestjs/common';
import { ExportOrdiniService } from './export-ordini.service';
import { ExportOrdiniController } from './export-ordini.controller';

@Module({
  controllers: [ExportOrdiniController],
  providers: [ExportOrdiniService],
  exports: [ExportOrdiniService],
})
export class ExportOrdiniModule {}
