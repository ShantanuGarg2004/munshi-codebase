import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsAppIncomingDto {
  @ApiProperty({
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: '/help',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
