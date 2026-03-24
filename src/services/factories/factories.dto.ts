import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
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
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID (UUID)',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    example: 'c42242d7-1e72-4cc3-b5e5-619b369d4370',
    description: 'Factory ID (UUID)',
  })
  @IsUUID()
  factory_id: string;

  @ApiProperty({
    example: USER_ROLE.WORKER,
    description: 'Role of the user in the factory',
    enum: USER_ROLE,
  })
  @IsString()
  role: USER_ROLE;
}
