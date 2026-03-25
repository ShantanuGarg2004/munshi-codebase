import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLE } from '../users/users.constants';

// -------- Factory DTO --------
export class CreateFactoryDto {
  @ApiProperty({
    example: 'ABC Textiles Pvt Ltd',
    description: 'Name of the factory',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Industrial Area Phase 2, Ludhiana, Punjab',
    description: 'Factory address',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateFactoryUserDto {
  @ApiProperty({
    example: '1',
  })
  @IsNumberString()
  user_id: string;

  @ApiProperty({
    example: '1',
  })
  @IsNumberString()
  factory_id: string;

  @ApiProperty({
    example: USER_ROLE.WORKER,
    description: 'Role of the user in the factory',
    enum: USER_ROLE,
  })
  @IsString()
  role: USER_ROLE;
}
