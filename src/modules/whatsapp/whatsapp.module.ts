import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { AttendanceModule } from 'src/services/attendance/attendance.module';
import { UserModule } from 'src/services/users/users.module';
import { IssueModule } from 'src/services/issues/issues.module';
import { TasksModule } from 'src/services/tasks/tasks.module';
import { FactoryModule } from 'src/services/factories/factories.module';

@Module({
  imports: [
    AttendanceModule,
    UserModule,
    IssueModule,
    TasksModule,
    FactoryModule,
  ],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
