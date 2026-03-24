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
import { User } from './users.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { FactoryUser } from '../factories/factories.schema';
import { CreateUserDto } from './users.dto';

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
    return this.userModel.findAll({
      include: [
        {
          model: this.dbService.sqlService.FactoryUser,
          as: 'factory_links',
          attributes: ['factory_id', 'role', 'doj'],
        },
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string) {
    const user = await this.userModel.findOne({
      where: { phone_number: phone },
      include: [
        {
          model: this.dbService.sqlService.FactoryUser,
          as: 'factory_links',
          attributes: ['factory_id', 'role', 'doj'],
        },
      ],
    });
    return user?.toJSON() as User & { factory_links: FactoryUser };
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
}
