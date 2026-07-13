import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdiniController } from './ordini.controller';
import { OrdiniService } from './ordini.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdiniController],
  providers: [OrdiniService],
})
export class OrdiniModule {}
