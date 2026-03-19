import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { CreateClassDto, CreateUserDto, UpdateUserDto } from './users.dto';
import { UserModel } from './users.schema';
import { ERROR_MESSAGES } from './users.constants'; 

@Injectable()
export class UserService {
  private readonly UserModel: typeof UserModel; 
  constructor(private readonly dbService: DbService) {
    this.UserModel = this.dbService.sqlService.UserModel; 
  }

  async getUserById(id: string) {
    const user = await this.UserModel.findOne({ where: { id } });
    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_EXIST);
    return user;
  }

  async getAllUser() {
    return await this.UserModel.findAll();
  }

  async getUserByEmail(email: string) {
    const user = await this.UserModel.findOne({
      where: { email },
    });
    return user;
  }

  async createUser(data: CreateUserDto) {
    const checkUser = await this.getUserByEmail(data.email);
    if (checkUser)
      throw new BadRequestException(ERROR_MESSAGES.USER_ALREADY_EXIST);

    return await this.UserModel.create({ ...data, id: data.supabase_id });
  }

  async updateUser(id: string, data: UpdateUserDto) {
    await this.getUserById(id);
    return await this.UserModel.update(data, {
      where: { id },
      returning: true,
    });
  }

 
}
