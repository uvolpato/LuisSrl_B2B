import { Module } from '@nestjs/common';
import { IntegrazioneController } from './integrazione.controller';
import { CatalogoController } from './catalogo.controller';
import { IntegrazioneService } from './integrazione.service';

@Module({
  controllers: [IntegrazioneController, CatalogoController],
  providers: [IntegrazioneService],
})
export class IntegrazioneModule {}
