import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrazioneController } from './integrazione.controller';
import { CatalogoController } from './catalogo.controller';
import { FamiglieController } from './famiglie.controller';
import { IntegrazioneService } from './integrazione.service';
import { SyncService } from './sync.service';
import { SyncManagerService } from './sync-manager.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [IntegrazioneController, CatalogoController, FamiglieController],
  providers: [IntegrazioneService, SyncService, SyncManagerService, EmbeddingService],
  exports: [IntegrazioneService, EmbeddingService],
})
export class IntegrazioneModule {}
