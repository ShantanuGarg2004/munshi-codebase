import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IsOptional, IsString } from 'class-validator';
import { User } from './users.schema';
import { DbService } from 'src/core/services/db-service/db.service';

//
// ✅ DTOs
//

export class CreateUserDto {
  @IsString()
  phone_number: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}

//
// ✅ SERVICE
//

@Injectable()
export class UserService {
  private readonly userModel: typeof User;
  constructor(private readonly dbService: DbService) {
    this.userModel = this.dbService.sqlService.User;
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.userModel.create(dto as any);
  }

  async findAll(): Promise<User[]> {
    return this.userModel.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({
      where: { phone_number: phone },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    await user.update(dto);
    return user;
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await user.destroy();
    return { message: 'User deleted successfully' };
  }
}

//
// ✅ CONTROLLER
//

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('by-phone')
  findByPhone(@Query('phone') phone: string) {
    return this.userService.findByPhone(phone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
