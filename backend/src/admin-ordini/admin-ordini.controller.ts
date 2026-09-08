import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/permission.decorator";
import { AdminOrdiniService } from "./admin-ordini.service";
import { AggiornaStatoOrdineDto } from "./dto/aggiorna-stato-ordine.dto";

@Controller("admin/ordini")
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission("vendite.ordini.view")
export class AdminOrdiniController {
  constructor(private readonly service: AdminOrdiniService) {}

  @Get("dashboard")
  async dashboard(
    @Query("dataDa") dataDa: string,
    @Query("dataA") dataA?: string,
    @Query("search") search?: string,
  ) {
    return this.service.getDashboard(dataDa || new Date().toISOString().slice(0, 10), dataA, search);
  }

  @Get("lookup")
  async lookup() {
    return this.service.getClientiLookup();
  }

  @Get()
  async findAll(
    @Query("dataDa") dataDa: string,
    @Query("dataA") dataA?: string,
    @Query("page", ParseIntPipe) page = 1,
    @Query("limit", ParseIntPipe) limit = 10,
    @Query("search") search?: string,
  ) {
    return this.service.findAll(dataDa || new Date().toISOString().slice(0, 10), dataA, page, limit, search);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(":id/stato")
  async aggiornaStato(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AggiornaStatoOrdineDto,
  ) {
    return this.service.aggiornaStato(id, dto.stato);
  }
}
