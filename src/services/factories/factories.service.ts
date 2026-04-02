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
import { Factory, FactoryUser } from './factories.schema';
import { DbService } from 'src/core/services/db-service/db.service';
import { CreateFactoryDto, CreateFactoryUserDto } from './factories.dto';

@Injectable()
export class FactoryService {
  private readonly factoryModel: typeof Factory;
  private readonly factoryUserModel: typeof FactoryUser;
  constructor(private readonly dbService: DbService) {
    this.factoryModel = this.dbService.sqlService.Factory;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

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

  async addUserToFactory(dto: CreateFactoryUserDto): Promise<FactoryUser> {
    return this.factoryUserModel.create(dto as any);
  }

  async getFactoryUsers(factory_id: number) {
    return this.factoryUserModel.findAll({
      where: {
        factory_id,
      },
      include: [
        {
          model: this.dbService.sqlService.User,
          as: 'user',
          attributes: ['id', 'name', 'phone_number'],
        },
      ],
      raw: true,
      nest: true,
    });
  }
}

@Controller('factories')
export class FactoryController {
  constructor(private readonly factoryService: FactoryService) {}

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

  @Post('assign-user')
  addUser(@Body() dto: CreateFactoryUserDto) {
    return this.factoryService.addUserToFactory(dto);
  }

  @Get(':id/users')
  getFactoryUsers(@Param('id') factoryId: string) {
    return this.factoryService.getFactoryUsers(Number.parseInt(factoryId));
  }
}
