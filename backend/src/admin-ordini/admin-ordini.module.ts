import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminOrdiniController } from "./admin-ordini.controller";
import { AdminOrdiniService } from "./admin-ordini.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdminOrdiniController],
  providers: [AdminOrdiniService],
})
export class AdminOrdiniModule {}
