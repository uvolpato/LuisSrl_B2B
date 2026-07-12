import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrazioneController } from './integrazione.controller';
import { CatalogoController } from './catalogo.controller';
import { IntegrazioneService } from './integrazione.service';
import { SyncService } from './sync.service';
import { SyncManagerService } from './sync-manager.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [IntegrazioneController, CatalogoController],
  providers: [IntegrazioneService, SyncService, SyncManagerService],
  exports: [IntegrazioneService],
})
export class IntegrazioneModule {}
