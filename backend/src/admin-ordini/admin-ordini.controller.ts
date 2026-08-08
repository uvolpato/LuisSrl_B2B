import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/permission.decorator";
import { AdminOrdiniService } from "./admin-ordini.service";

@Controller("admin/ordini")
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission("vendite.ordini.view")
export class AdminOrdiniController {
  constructor(private readonly service: AdminOrdiniService) {}

  @Get("dashboard")
  async dashboard(
    @Query("data") data: string,
    @Query("search") search?: string,
  ) {
    return this.service.getDashboard(data || new Date().toISOString().slice(0, 10), search);
  }

  @Get("lookup")
  async lookup() {
    return this.service.getClientiLookup();
  }

  @Get()
  async findAll(
    @Query("data") data: string,
    @Query("page", ParseIntPipe) page = 1,
    @Query("limit", ParseIntPipe) limit = 10,
    @Query("search") search?: string,
  ) {
    return this.service.findAll(data || new Date().toISOString().slice(0, 10), page, limit, search);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
