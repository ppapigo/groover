import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        isProfilePublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findMe(userId: string) {
    return this.findById(userId);
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        isProfilePublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updatePrivacy(userId: string, isProfilePublic: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isProfilePublic },
      select: {
        id: true,
        isProfilePublic: true,
      },
    });
    return { success: true, data: user };
  }

  async deleteMe(userId: string) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}