import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WhatsAppIncomingDto {
  @ApiProperty({
    example: '911234567890',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: 'transformer kharab ho gya h',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class WhatsAppIncomingServiceDto {
  @ApiProperty({
    example: '911234567890',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: 'transformer kharab ho gya h',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: '/help',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  command?: string;

  @ApiProperty({
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  id?: number;
}
