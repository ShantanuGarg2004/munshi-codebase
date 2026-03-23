import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { USER_ROLE } from '../users/users.constants';
import { Factory, FactoryUser } from './factories.schema';
import { DbService } from 'src/core/services/db-service/db.service';

//
// ✅ DTOs
//

// -------- Factory DTO --------
export class CreateFactoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateFactoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

// -------- FactoryUser DTO --------
export class CreateFactoryUserDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  factory_id: string;

  @IsString()
  role: USER_ROLE;

  @IsOptional()
  @IsDateString()
  doj?: Date;
}

export class UpdateFactoryUserDto {
  @IsOptional()
  @IsString()
  role?: USER_ROLE;

  @IsOptional()
  @IsDateString()
  doj?: Date;
}

//
// ✅ SERVICE
//

@Injectable()
export class FactoryService {
  private readonly factoryModel: typeof Factory;
  private readonly factoryUserModel: typeof FactoryUser;
  constructor(private readonly dbService: DbService) {
    this.factoryModel = this.dbService.sqlService.Factory;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  //
  // 🔹 FACTORY METHODS
  //

  async createFactory(dto: CreateFactoryDto): Promise<Factory> {
    return this.factoryModel.create(dto as any);
  }

  async getAllFactories(): Promise<Factory[]> {
    return this.factoryModel.findAll({
      include: [{ model: FactoryUser, as: 'members' }],
    });
  }

  async getFactoryById(id: string): Promise<Factory> {
    const factory = await this.factoryModel.findByPk(id, {
      include: [{ model: FactoryUser, as: 'members' }],
    });

    if (!factory) throw new NotFoundException('Factory not found');
    return factory;
  }

  async updateFactory(id: string, dto: UpdateFactoryDto): Promise<Factory> {
    const factory = await this.getFactoryById(id);
    await factory.update(dto);
    return factory;
  }

  //
  // 🔹 FACTORY USER METHODS
  //

  async addUserToFactory(dto: CreateFactoryUserDto): Promise<FactoryUser> {
    return this.factoryUserModel.create(dto as any);
  }

  async getFactoryUsers(factoryId: string): Promise<FactoryUser[]> {
    return this.factoryUserModel.findAll({
      where: { factory_id: factoryId },
    });
  }

  async updateFactoryUser(
    id: string,
    dto: UpdateFactoryUserDto,
  ): Promise<FactoryUser> {
    const record = await this.factoryUserModel.findByPk(id);

    if (!record) throw new NotFoundException('FactoryUser not found');

    await record.update(dto);
    return record;
  }
}

//
// ✅ CONTROLLER
//

@Controller('factories')
export class FactoryController {
  constructor(private readonly factoryService: FactoryService) {}

  //
  // 🔹 FACTORY ROUTES
  //

  @Post()
  createFactory(@Body() dto: CreateFactoryDto) {
    return this.factoryService.createFactory(dto);
  }

  @Get()
  getAllFactories() {
    return this.factoryService.getAllFactories();
  }

  @Get(':id')
  getFactory(@Param('id') id: string) {
    return this.factoryService.getFactoryById(id);
  }

  @Patch(':id')
  updateFactory(@Param('id') id: string, @Body() dto: UpdateFactoryDto) {
    return this.factoryService.updateFactory(id, dto);
  }

  //
  // 🔹 FACTORY USER ROUTES
  //

  @Post('assign-user')
  addUser(@Body() dto: CreateFactoryUserDto) {
    return this.factoryService.addUserToFactory(dto);
  }

  @Get(':id/users')
  getFactoryUsers(@Param('id') factoryId: string) {
    return this.factoryService.getFactoryUsers(factoryId);
  }

  @Patch('user/:id')
  updateFactoryUser(
    @Param('id') id: string,
    @Body() dto: UpdateFactoryUserDto,
  ) {
    return this.factoryService.updateFactoryUser(id, dto);
  }
}
