import { Controller, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FcmService } from './fcm.service';

@Controller('fcm')
export class FcmController {
  constructor(private fcmService: FcmService) {}

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async registerToken(@Request() req, @Body() dto: { token: string; device?: string }) {
    await this.fcmService.saveToken(req.user.id, dto.token, dto.device);
    return { success: true, message: 'Token registered' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('token')
  async removeToken(@Request() req, @Body() dto: { token: string }) {
    await this.fcmService.removeToken(req.user.id, dto.token);
    return { success: true, message: 'Token removed' };
  }
}