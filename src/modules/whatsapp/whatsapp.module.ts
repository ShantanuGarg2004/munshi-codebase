import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { AttendanceModule } from 'src/services/attendance/attendance.module';
import { UserModule } from 'src/services/users/users.module';

@Module({
  imports: [AttendanceModule, UserModule],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
