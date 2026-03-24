import { Body, Controller, Post } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';

@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post()
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    return this.whatsappService.handleIncomingMessage(body);
  }
}
