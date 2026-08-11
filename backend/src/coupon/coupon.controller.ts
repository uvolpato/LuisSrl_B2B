import { Controller, Get, Post, Param, Body, Query, UseGuards } from "@nestjs/common";
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

  @Post("preview-segment")
  previewSegment(@Body() body: { filters?: any[] }) {
    return this.svc.previewSegment(body.filters ?? []);
  }

  @Get("ai-suggestions")
  aiSuggestions() { return this.svc.getAISuggestions(); }

  @Post("qrcode")
  qrcode(@Body() body: { code: string }) { return this.svc.generateQR(body.code); }

  @Post(":id/send")
  @RequirePermission("vendite.coupon.edit")
  send(@Param("id") id: string, @Body() body: any) {
    return this.svc.sendCampaign(Number(id), body);
  }
}
