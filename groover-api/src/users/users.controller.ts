import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.usersService.findMe(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.id, updateUserDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Request() req) {
    return this.usersService.deleteMe(req.user.id);
  }

  // 프로필 공개/비공개 설정
  @Put('me/privacy')
  @UseGuards(JwtAuthGuard)
  async updatePrivacy(@Request() req, @Body() body: { isProfilePublic: boolean }) {
    return this.usersService.updatePrivacy(req.user.id, body.isProfilePublic);
  }

  // 다른 사람 프로필 조회 (공개 설정에 따라)
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserById(@Request() req, @Param('id') id: string) {
    const user = await this.usersService.findById(id);
    
    // 본인이면 전체 공개
    if (req.user?.id === id) {
      return user;
    }
    
    // 비공개 프로필이면 제한된 정보만
    if (!user.isProfilePublic) {
      return {
        id: user.id,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        isProfilePublic: false,
        message: '비공개 프로필입니다.',
      };
    }
    
    return user;
  }
}