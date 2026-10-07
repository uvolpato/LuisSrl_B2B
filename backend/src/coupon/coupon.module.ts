import { Module } from "@nestjs/common";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";
import { IntegrazioneModule } from "../integrazione/integrazione.module";

@Module({
  imports: [IntegrazioneModule],
  controllers: [CouponController],
  providers: [CouponService],
})
export class CouponModule {}
