import { Injectable } from '@nestjs/common';
import { AttendanceService } from 'src/services/attendance/attendance.service';
import { UserService } from 'src/services/users/users.service';

@Injectable()
export class WhatsAppService {
  constructor(
    // private readonly tasksService: TasksService,
    private readonly attendanceService: AttendanceService,
    // private readonly issuesService: IssuesService,
    private readonly usersService: UserService,
  ) {}

  async handleIncomingMessage(body: any) {
    const message = body?.message?.trim().toLowerCase();
    const phone = body?.from;

    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      return { message: 'User not registered' };
    }

    console.log({ message });

    // 🟢 Attendance
    if (message === 'present' || message === 'absent') {
      return this.attendanceService.markAttendance(
        user.id,
        '65ef6f17-9878-4c02-90c0-2bbf25bbbf2c', // replace later
        message === 'present',
      );
    }

    // 📋 Assign Task
    // if (message.startsWith('/assign')) {
    //   return this.handleAssign(message, user);
    // }

    // 🔄 Update Task
    // if (message.startsWith('/update')) {
    //   return this.tasksService.addUpdate(user.id, message);
    // }

    // 🚨 Issue
    // if (message.startsWith('/issue')) {
    //   return this.issuesService.createIssue(user.id, 'factoryId', message);
    // }

    return { message: 'Unknown command' };
  }
}
