import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Body, 
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './users.service';
import { 
  CreateUserDto,
  UpdateUserDto, 
} from './users.dto'; 

@ApiTags('Users & Developers')
@Controller('users')
// @UseGuards(InternalCallGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers() {
    return this.userService.getAllUser();
  }

  @Get('details')
  @ApiOperation({ summary: 'Get user by id (UUID)' })
  async getUserById(@Query('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  @Put()
  @ApiOperation({ summary: 'Update a user' })
  async updateUser(@Body() data: UpdateUserDto, @Query('id') id: string) {
    return this.userService.updateUser(id, data);
  }
}

 