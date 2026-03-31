import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceService } from 'src/services/attendance/attendance.service';
import { UserService } from 'src/services/users/users.service';
import { WhatsAppIncomingDto } from './whatsapp.dto';
import { IssueService } from 'src/services/issues/issues.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TasksService } from 'src/services/tasks/tasks.service';
import { COMMAND_HINTS, COMMANDS } from './whatsapp.constants';
import { FactoryService } from 'src/services/factories/factories.service';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  constructor(
    private readonly tasksService: TasksService,
    private readonly attendanceService: AttendanceService,
    private readonly issuesService: IssueService,
    private readonly usersService: UserService,
    private readonly factoryService: FactoryService,
  ) {}

  async sendTextMessage(to: string, message: string) {
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;

    return axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async sendTemplate(to: string, templateName: string) {
    const url = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;

    return axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async handleIncomingMessage(body: WhatsAppIncomingDto) {
    try {
      const result: any = await this.processCommand(body);
      const message =
        typeof result === 'string' ? result : result?.message || result;

      await this.sendTextMessage(body.from, `${JSON.stringify(message)}`);

      return 'ok';
    } catch (error) {
      await this.sendTextMessage(
        body.from,
        error.message || 'Something went wrong',
      );

      return 'error';
    }
  }

  async processCommand(body: WhatsAppIncomingDto) {
    const rawMessage = body?.message?.trim();
    const message = rawMessage?.toLowerCase();
    const command = message.split(' ')[0];
    const phone = body?.from;

    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    const factoryId = user.factory_links?.factory_id;
    const role = user.factory_links?.role;

    if (!factoryId)
      throw new NotFoundException('User not assigned to any factory');

    // 🟢 Attendance
    //
    if (command === COMMANDS.HELP) return COMMAND_HINTS;
    if (command === COMMANDS.PRESENT || command === COMMANDS.ABSENT)
      return this.attendanceService.markAttendance(
        user.id,
        factoryId,
        command === COMMANDS.PRESENT,
      );

    // 👷 Get Workers (Manager/Owner only)
    if (command === COMMANDS.MEMEBERS) {
      this.ensureManager(role);

      const workers = await this.factoryService.getFactoryUsers(factoryId);

      if (!workers.length) {
        return { message: 'No workers found in factory' };
      }

      return workers;
    }

    // 📋 Tasks
    if (command === COMMANDS.TASKS) return this.tasksService.getTasks(user);

    // 📋 Assign
    if (command == COMMANDS.ASSIGN) {
      this.ensureManager(role);

      const { assigned_to, description } = this.parseAssignCommand(rawMessage);

      return this.tasksService.handleAssign(
        user.id,
        factoryId,
        assigned_to,
        description,
      );
    }

    // 🔄 Update
    if (command == COMMANDS.UPDATE) {
      this.ensureWorker(role);

      const { task_id, updateMessage } = this.parseUpdateCommand(rawMessage);

      return this.tasksService.addUpdate(
        user.id,
        factoryId,
        task_id,
        updateMessage,
      );
    }

    // 🚨 Issues list
    if (command === COMMANDS.ISSUES)
      return this.issuesService.getActiveIssues(factoryId);

    // 🚨 Create issue
    if (command == COMMANDS.ISSUE) {
      const issueMessage = rawMessage.replace(COMMANDS.ISSUE, '').trim();

      return this.issuesService.createIssue(user.id, factoryId, issueMessage);
    }

    // 🚨 Resolve issue
    if (command == COMMANDS.RESOLVE) {
      this.ensureManager(role);

      const issueId = rawMessage.split(' ')[1];

      if (!issueId) {
        throw new NotFoundException('Issue ID required');
      }

      return this.issuesService.resolveIssue(issueId);
    }

    if (command == COMMANDS.COMPLETE) {
      if (role !== USER_ROLE.WORKER) {
        throw new ForbiddenException('Only workers can complete tasks');
      }

      const parts = message.split(' ');
      const task_id = Number(parts[1]);

      if (!task_id || isNaN(task_id)) {
        throw new NotFoundException('Format: /complete <taskId>');
      }

      return this.tasksService.completeTask(user.id, factoryId, task_id);
    }

    return { message: 'Unknown command: use /help to check list of commands' };
  }

  // 🔒 Role Guards

  private ensureManager(role: string) {
    if (role === USER_ROLE.WORKER) {
      throw new ForbiddenException(
        'Only managers and owners can perform this action',
      );
    }
  }

  private ensureWorker(role: string) {
    if (role !== USER_ROLE.WORKER) {
      throw new ForbiddenException('Only workers can perform this action');
    }
  }

  // 🧠 Parsers

  private parseAssignCommand(message: string) {
    const parts = message.split(' ');

    const assigned_to = parts[1];
    const description = parts.slice(2).join(' ').trim();

    if (!assigned_to || !description) {
      throw new NotFoundException('Format: /assign @user or @all [task]');
    }

    return { assigned_to, description };
  }

  private parseUpdateCommand(message: string) {
    const parts = message.split(' ');

    const task_id = Number.parseInt(parts[1]);
    const updateMessage = parts.slice(2).join(' ').trim();

    if (!task_id || !updateMessage) {
      throw new NotFoundException('Format: /update <taskId> <message>');
    }

    return { task_id, updateMessage };
  }
}
