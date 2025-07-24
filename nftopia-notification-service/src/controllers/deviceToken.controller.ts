import { Controller, Post } from "@nestjs/common";
import { RedisService } from "@/services/redisService";

@Controller("device-token")
export class DeviceTokensController {
  constructor(private redisService: RedisService) {}

  @Post()
  async registerToken(body: { userId: string; token: string }) {
    const { userId, token } = body;
    if (!userId || !token) throw new Error("Missing token or userId");

    await this.redisService.set(`device-token:${userId}`, token);
    return { success: true };
  }
}
