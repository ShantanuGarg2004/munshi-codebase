import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { UserService } from '../users/users.service';

@Module({
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
