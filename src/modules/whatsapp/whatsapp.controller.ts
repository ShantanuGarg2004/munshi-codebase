import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';

@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  // 🔐 Verification (Meta requirement)
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    return 'Verification failed';
  }

  // 📩 Incoming messages
  @Post()
  async receiveMessage(@Body() body: any) {
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return 'No message';

    const from = message.from;
    const text = message.text?.body;

    return this.whatsappService.handleIncomingMessage({
      from,
      message: text,
    });
  }

  @Post('test')
  async handleMessage(@Body() body: WhatsAppIncomingDto) {
    return this.whatsappService.handleIncomingMessage(body);
  }
}
