import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { UserService } from '../users/users.service';
import { randomUUID } from 'crypto';
import { USER_ROLE } from '../users/users.constants';
import { Task, TaskUpdate } from './tasks.schema';
import { FactoryUser } from '../factories/factories.schema';

@Injectable()
export class TasksService {
  private readonly taskModel: typeof Task;
  private readonly taskUpdateModel: typeof TaskUpdate;
  private readonly factoryUserModel: typeof FactoryUser;

  constructor(
    private readonly dbService: DbService,
    private readonly usersService: UserService,
  ) {
    this.taskModel = this.dbService.sqlService.Task;
    this.taskUpdateModel = this.dbService.sqlService.TaskUpdate;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  // 📋 ASSIGN TASK
  async handleAssign(
    user_id: number,
    factory_id: number,
    assigned_to: string,
    description: string,
  ) {
    if (!assigned_to || !description) {
      throw new NotFoundException('Invalid assign command');
    }

    if (assigned_to === '@all') {
      return this.assignToAll(user_id, factory_id, description);
    }

    const phone = assigned_to.replace('@', '');
    return this.assignToUser(phone, user_id, factory_id, description);
  }

  // 👤 Assign to one
  async assignToUser(
    phone: string,
    assigned_by: number,
    factory_id: number,
    description: string,
  ) {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new NotFoundException('Worker not found');
    }

    await this.taskModel.create({
      assigned_to: user.id,
      assigned_by,
      factory_id,
      description,
    });

    return 'Task assigned successfully';
  }

  // 👥 Assign to ALL
  async assignToAll(
    assigned_by: number,
    factory_id: number,
    description: string,
  ) {
    const workers = await this.factoryUserModel.findAll({
      where: {
        factory_id,
        role: USER_ROLE.WORKER,
      },
    });

    const batchId = randomUUID();

    const tasks = workers.map((w) => ({
      assigned_to: w.user_id,
      assigned_by,
      factory_id,
      description,
      batch_id: batchId,
    }));

    await this.taskModel.bulkCreate(tasks);

    return `Task assigned to ${workers.length} workers`;
  }

  async addUpdate(
    user_id: number,
    factory_id: number,
    task_id: number,
    message: string,
  ) {
    const cleanMessage = message.trim();

    if (!task_id || !cleanMessage) {
      throw new NotFoundException('Invalid update command');
    }

    // 🔥 Find task
    const task = await this.taskModel.findByPk(task_id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 🔒 Security checks
    if (task.factory_id != factory_id) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    if (task.assigned_to != user_id) {
      throw new NotFoundException('You are not assigned to this task');
    }

    if (task.is_completed) {
      throw new NotFoundException('Task already completed');
    }

    // 🔄 Create update
    await this.taskUpdateModel.create({
      task_id,
      user_id,
      message: cleanMessage,
    });

    // ✅ Auto-complete logic
    const lower = cleanMessage.toLowerCase();

    return {
      message: 'Update added successfully',
      task_id,
    };
  }

  async getTasks(user: any) {
    const userId = user.id;
    const factoryId = user.factory_links.factory_id;
    const role = user.factory_links.role;

    // 👷 WORKER → incomplete tasks
    if (role === 'WORKER') {
      const tasks = await this.taskModel.findAll({
        where: {
          assigned_to: userId,
          factory_id: factoryId,
          is_completed: false,
        },
        order: [['created_at', 'DESC']],
      });

      if (!tasks.length) {
        return { message: 'No pending tasks 🎉' };
      }
      return tasks;
      // return {
      //   message: this.formatTasks(tasks, '📋 Your Pending Tasks'),
      // };
    } else {
      const tasks = await this.taskModel.findAll({
        where: {
          factory_id: factoryId,
          is_completed: false,
        },
        order: [['updated_at', 'DESC']],
        limit: 20, // optional limit
      });

      if (!tasks.length) {
        return { message: 'No pending tasks yet' };
      }
      return tasks;
      // return {
      //   tasks,
      //   message: this.formatTasks(tasks, '✅ Completed Tasks'),
      // };
    }

    return { message: 'Invalid role' };
  }

  private formatTasks(tasks: any[], title: string) {
    let text = `${title}\n\n`;

    tasks.forEach((task, index) => {
      text += `${index + 1}. ${task.description}\n`;
      text += `🆔 ${task.id}\n\n`;
    });

    return text;
  }

  async completeTask(user_id: number, factory_id: number, task_id: number) {
    if (!task_id) {
      throw new NotFoundException('Task ID required');
    }

    const task = await this.taskModel.findByPk(task_id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 🔒 Security checks
    if (task.factory_id !== factory_id) {
      throw new NotFoundException('Task does not belong to your factory');
    }

    if (task.assigned_to !== user_id) {
      throw new NotFoundException('You are not assigned to this task');
    }

    if (task.is_completed) {
      return { message: 'Task already completed ✅' };
    }

    // ✅ Mark complete
    await task.update({ is_completed: true });

    return {
      message: `Task #${task_id} marked as completed ✅`,
    };
  }
}
