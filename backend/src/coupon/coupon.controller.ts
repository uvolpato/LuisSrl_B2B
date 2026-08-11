import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req, HttpCode, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermission } from "../auth/decorators/permission.decorator";
import { CouponService } from "./coupon.service";

@Controller("admin/coupon")
@UseGuards(AuthenticatedGuard, PermissionsGuard)
@RequirePermission("vendite.coupon.view")
export class CouponController {
  constructor(private readonly svc: CouponService) {}

  @Get("dashboard")
  dashboard() { return this.svc.getDashboard(); }

  @Get()
  findAll(@Query("search") search?: string, @Query("status") status?: string) {
    return this.svc.findAll(search, status);
  }

  @Post()
  @RequirePermission("vendite.coupon.edit")
  create(@Body() body: any) { return this.svc.create(body); }

  @Put(":id")
  @RequirePermission("vendite.coupon.edit")
  update(@Param("id") id: string, @Body() body: any) {
    return this.svc.update(Number(id), body);
  }

  @Post("preview-segment")
  previewSegment(@Body() body: { filters?: any[] }) {
    return this.svc.previewSegment(body.filters ?? []);
  }

  @Get("ai-suggestions")
  aiSuggestions() { return this.svc.getAISuggestions(); }

  @Post("qrcode")
  qrcode(@Body() body: { code: string }) { return this.svc.generateQR(body.code); }

  @Get(":id/usage")
  async getUsage(@Param("id") id: string) {
    return this.svc.getUsage(Number(id));
  }

  @Get(":id/clients")
  async getClients(@Param("id") id: string) {
    return this.svc.getTargetClients(Number(id));
  }

  @Patch(":id/remove-client/:customerId")
  @RequirePermission("vendite.coupon.edit")
  send(@Param("id") id: string, @Body() body: any) {
    return this.svc.sendCampaign(Number(id), body);
  }

  @Patch(":id/status")
  @RequirePermission("vendite.coupon.edit")
  toggleStatus(@Param("id") id: string, @Body() body: { status: string }) {
    return this.svc.updateStatus(Number(id), body.status);
  }

  @Patch(":id/remove-client/:customerId")
  @RequirePermission("vendite.coupon.edit")
  removeClient(@Param("id") id: string, @Param("customerId") custId: string) {
    return this.svc.removeClient(Number(id), Number(custId));
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermission("vendite.coupon.edit")
  async delete(@Param("id") id: string) {
    await this.svc.delete(Number(id));
  }
}
