import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceService } from 'src/services/attendance/attendance.service';
import { UserService } from 'src/services/users/users.service';
import {
  WhatsAppIncomingDto,
  WhatsAppIncomingServiceDto,
} from './whatsapp.dto';
import { IssueService } from 'src/services/issues/issues.service';
import { USER_ROLE } from 'src/services/users/users.constants';
import { TasksService } from 'src/services/tasks/tasks.service';
import { COMMAND_HINTS, COMMANDS } from './whatsapp.constants';
import { FactoryService } from 'src/services/factories/factories.service';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportService } from 'src/services/reports/reports.service';

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
    private readonly reportService: ReportService,
  ) {}

  async sendTextMessage(to: string, message: string) {
    console.log(process.env.OLLI_URL);

    const url = `${process.env.OLLI_URL}/external/waba/send`;

    try {
      const response = await axios.post(
        url,
        {
          to,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            'X-API-Key': process.env.OLLI_KEY,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log(response.data);

      return response.data;
    } catch (error: any) {
      console.log(
        'WhatsApp Send Error:',
        error?.response?.data || error.message,
      );

      throw error;
    }
  }
  // export function formatCommandHints(commands: typeof COMMAND_HINTS) {
  //   return commands
  //     .map((c) => `${c.command} - ${c.hint}`)
  //     .join('\n');
  // }

  async sendTemplate(
    to: string,
    templateName: string,
    options?: {
      languageCode?: string;
      body?: (string | number)[];
    },
  ) {
    const url = `${process.env.OLLI_URL}/external/waba/send`;

    const components: any[] = [];

    if (options?.body?.length) {
      components.push({
        type: 'body',
        parameters: options.body.map((val) => ({
          type: 'text',
          text: String(val),
        })),
      });
    }

    const response = await axios.post(
      url,
      {
        to,
        type: 'template',
        template: {
          name: templateName,
          language: options?.languageCode || 'en',
          components,
        },
      },
      {
        headers: {
          'X-API-Key': process.env.OLLI_KEY,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(response);

    return response.data;
  }
  async handleIncomingMessage(body: WhatsAppIncomingDto) {
    console.log({ body });
    try {
      const ml_url = process.env.ML_URL || `http://localhost:8000`;

      const response = await axios.post(
        `${ml_url}/classify?message=${body.message}`,
      );

      console.log('anisole', response.data);

      const result: any = await this.processCommand({
        ...body,
        command: response.data.intent,
        id: response.data.id,
        date: response.data.date,
      });

      console.log({ result });

      const message =
        typeof result === 'string' ? result : result?.message || result;
      await this.sendTextMessage(body.from, result);
      return 'ok';
    } catch (error) {
      console.log(error);
      await this.sendTextMessage(
        body.from,
        error.message || 'Something went wrong',
      );

      console.log(error);

      return 'error';
    }
  }

  async processCommand(body: WhatsAppIncomingServiceDto) {
    const rawMessage = body?.message?.trim();
    const command = body.command?.startsWith('/')
      ? body.command
      : `/${body.command}`;
    const id = body.id;
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
    //

    const formattedText = `👋 Hello ${user?.name || 'User'},

    Welcome to *Munshi Assistant* 🤖

    Manage attendance, tasks & issues directly from WhatsApp.

    ━━━━━━━━━━━━━━━

    🟢 *Attendance Examples*

    • "present"
    • "absent"

    ━━━━━━━━━━━━━━━

    📋 *Task Examples*

    • "show my tasks"
    • "complete task 4"
    • "@919876543210 finish machine repair"
    • "@all clean warehouse today"
    • "update task 3 work completed"

    ━━━━━━━━━━━━━━━

    🚨 *Issue Examples*

    • "machine not working"
    • "water leakage in unit 2"
    • "show active issues"
    • "resolve issue 5"

    ━━━━━━━━━━━━━━━

    👥 *Team Examples*

    • "show team"
    • "who is absent today"

    ━━━━━━━━━━━━━━━

    ✨ You can now chat naturally instead of remembering commands.

    💡 Example:
    "@919850411406 aaj khana bna lena"
    `;

    if (command === COMMANDS.REPORT) {
      this.ensureManager(role);

      return this.reportService.generateReport(factoryId, body.date);
    }

    if (command === COMMANDS.HELP) return formattedText;

    if (command === COMMANDS.PRESENT || command === COMMANDS.ABSENT)
      return this.attendanceService.markAttendance(
        user.id,
        factoryId,
        command === COMMANDS.PRESENT,
      );

    if (command === COMMANDS.MEMEBERS) {
      this.ensureManager(role);

      const workers = await this.factoryService.getFactoryUsers(factoryId);

      console.log({ workers });

      if (!workers.length) {
        return `👥 *Team Members*

    No members found in your factory.

    ━━━━━━━━━━━━━━━

    ⚠️ Add members to start managing tasks`;
      }

      const membersList = workers
        .map((u: any, i) => `${i + 1}. ${u.user.name} (${u.role})`)
        .join('\n');

      return `👥 *Your Team Overview*

    Here are the active members:

    ${membersList}

    ━━━━━━━━━━━━━━━

    👑 You are managing this team
    📋 Use /assign to assign tasks`;
    }

    // =========================
    // 📋 TASKS COMMANDS
    // =========================

    // 📋 VIEW TASKS
    if (command === COMMANDS.TASKS) {
      const tasks = await this.tasksService.getTasks(user);

      if (!Array.isArray(tasks) || !tasks.length) {
        return `📋 *Tasks*

    No pending tasks 🎉

    ━━━━━━━━━━━━━━━

    ✨ You're all caught up!`;
      }

      let text = `📋 *Your Tasks*\n\n`;

      tasks.slice(0, 10).forEach((task: any, index: number) => {
        const isOverdue = task.deadline && new Date(task.deadline) < new Date();

        const deadline = task.deadline
          ? `${new Date(task.deadline).toLocaleDateString()} ${
              isOverdue ? '⚠️ Overdue' : ''
            }`
          : 'No deadline';

        text += `${index + 1}. ${task.description}\n`;
        text += `🆔 ID: ${task.id}\n`;
        text += `⏳ ${deadline}\n`;
        text += `📌 ${task.is_completed ? '✅ Done' : '⏳ Pending'}\n\n`;
      });

      text += `━━━━━━━━━━━━━━━\n\n💡 Use /complete [taskId]`;

      return text;
    }

    // ✅ COMPLETE TASK
    if (command === COMMANDS.COMPLETE) {
      if (!id || isNaN(id)) {
        return `⚠️ Invalid Format

    Use:
     /complete [taskId]

    Example:
     /complete 12`;
      }

      const result = await this.tasksService.completeTask(
        user.id,
        factoryId,
        id,
      );

      return result?.message
        ? `✅ *Task Completed*

    🆔 Task ID: ${id}

    ━━━━━━━━━━━━━━━

    ${result.message}`
        : result;
    }

    // 🧑‍🤝‍🧑 ASSIGN TASK
    if (command === COMMANDS.ASSIGN) {
      this.ensureManager(role);

      const parts = rawMessage.split(' ');
      const assigned_to = JSON.stringify(id);
      const description = parts.slice(2).join(' ').trim();

      if (!assigned_to || !description) {
        return `⚠️ Invalid Format

    Use:
     /assign @user or @all [task]

    Example:
     /assign @ajay Fix login bug`;
      }

      const result = await this.tasksService.handleAssign(
        user.id,
        factoryId,
        assigned_to,
        description,
      );

      return typeof result === 'string'
        ? `🧑‍🤝‍🧑 *Task Assigned*

    📝 ${description}

    ━━━━━━━━━━━━━━━

    ${result}`
        : result;
    }

    if (command === COMMANDS.UPDATE) {
      this.ensureWorker(role);

      const parts = rawMessage.split(' ');
      const task_id = id;
      const updateMessage = parts.slice(2).join(' ').trim();

      if (!task_id || !updateMessage) {
        return `⚠️ Invalid Format

    Use:
     /update [taskId] [message]

    Example:
     /update 12 Work completed`;
      }

      const result = await this.tasksService.addUpdate(
        user.id,
        factoryId,
        task_id,
        updateMessage,
      );

      return result?.message
        ? `🔄 *Task Updated*

    🆔 Task ID: ${task_id}
    📝 ${updateMessage}

    ━━━━━━━━━━━━━━━

    ${result.message}`
        : result;
    }

    // =========================
    // 🚨 ISSUES COMMANDS
    // =========================

    // 📋 VIEW ACTIVE ISSUES
    if (command === COMMANDS.ISSUES) {
      const issues = await this.issuesService.getActiveIssues(factoryId);

      if (!issues || !issues.length) {
        return `🚨 *Active Issues*

    No active issues found ✅

    ━━━━━━━━━━━━━━━

    ✨ Everything is running smoothly`;
      }

      let text = `🚨 *Active Issues*\n\n`;

      issues.slice(0, 10).forEach((issue: any, index: number) => {
        const date = new Date(issue.created_at).toLocaleDateString();

        text += `${index + 1}. ${issue.message}\n`;
        text += `🆔 ID: ${issue.id}\n`;
        text += `📅 ${date}\n\n`;
      });

      text += `━━━━━━━━━━━━━━━\n\n💡 Use /resolve [issueId] to fix an issue`;

      return text;
    }

    // 🚨 CREATE ISSUE
    if (command === COMMANDS.ISSUE) {
      const issueMessage = rawMessage.replace(COMMANDS.ISSUE, '').trim();

      if (!issueMessage) {
        return `⚠️ Invalid Format

    Use:
     /issue [message]

    Example:
     /issue Machine not working`;
      }

      await this.issuesService.createIssue(user.id, factoryId, issueMessage);

      return `🚨 *Issue Reported*

    📝 ${issueMessage}

    ━━━━━━━━━━━━━━━

    ✅ Issue submitted successfully`;
    }

    // ✅ RESOLVE ISSUE
    if (command === COMMANDS.RESOLVE) {
      this.ensureManager(role);

      if (!id) {
        return `⚠️ Invalid Format

    Use:
     /resolve [issueId]

    Example:
     /resolve 5`;
      }

      const issueId = JSON.stringify(id);
      const result = await this.issuesService.resolveIssue(issueId);

      return result?.message
        ? `✅ *Issue Resolved*

    🆔 Issue ID: ${issueId}

    ━━━━━━━━━━━━━━━

    ${result.message}`
        : result;
    }

    return 'Unknown command: use /help to check list of commands';
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

@Injectable()
export class AttendanceCronService {
  constructor(
    private readonly factoryService: FactoryService,
    private readonly attendanceService: AttendanceService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // 🟢 9 AM initial reminder
  @Cron('0 9 * * *')
  async sendMorningReminder() {
    await this.sendReminder('Morning');
  }

  // 🔁 Every 2 hours retry
  @Cron(CronExpression.EVERY_2_HOURS)
  async sendRetryReminder() {
    const hour = new Date().getHours();

    // ❌ Skip before 9 AM
    if (hour < 11) return;

    // ❌ Stop after 7 PM (optional)
    if (hour > 19) return;

    await this.sendReminder('Retry');
  }

  // 🔥 Core Logic
  async sendReminder(type: 'Morning' | 'Retry') {
    const workers: any = await this.factoryService.getAllWorkers(); // implement this

    const today = new Date().toISOString().split('T')[0];

    for (const worker of workers) {
      const w = worker.toJSON();
      const userId = w.user_id;
      const factoryId = w.factory_id;
      const phone = w.user.phone_number;

      // ✅ Check attendance
      const alreadyMarked = await this.attendanceService.isMarkedToday(
        userId,
        factoryId,
      );

      if (alreadyMarked) continue;

      // 🚀 Send template
      await this.whatsappService.sendTemplate(
        phone,
        'factory_attendance_reminder',
        { body: [w.user.name || 'Worker'] },
      );

      // ⏳ small delay (avoid rate limit)
      await this.delay(300);
    }
  }

  private async delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
