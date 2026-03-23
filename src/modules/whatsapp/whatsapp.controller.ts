import { Body, Controller, Post } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WhatsAppIncomingDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post()
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    return this.whatsappService.handleIncomingMessage(body);
  }
}
