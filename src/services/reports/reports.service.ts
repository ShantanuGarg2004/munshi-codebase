import { Injectable } from '@nestjs/common';
import { DbService } from 'src/core/services/db-service/db.service';
import { Attendance } from '../attendance/attendance.schema';
import { Task } from '../tasks/tasks.schema';
import { Issue } from '../issues/issues.schema';
import { FactoryUser } from '../factories/factories.schema';
import { USER_ROLE } from '../users/users.constants';

@Injectable()
export class ReportService {
  private attendanceModel: typeof Attendance;
  private taskModel: typeof Task;
  private issueModel: typeof Issue;
  private factoryUserModel: typeof FactoryUser;

  constructor(private readonly dbService: DbService) {
    this.attendanceModel = this.dbService.sqlService.Attendance;
    this.taskModel = this.dbService.sqlService.Task;
    this.issueModel = this.dbService.sqlService.Issue;
    this.factoryUserModel = this.dbService.sqlService.FactoryUser;
  }

  async generateReport(factoryId: number, date?: string) {
    const reportDate = date || new Date().toISOString().split('T')[0];

    // 👷 Total Workers
    const totalWorkers = await this.factoryUserModel.count({
      where: { factory_id: factoryId, role: USER_ROLE.WORKER },
    });

    // 📅 Attendance
    const presentCount = await this.attendanceModel.count({
      where: {
        factory_id: factoryId,
        date: reportDate,
        is_present: true,
      },
    });

    const absentCount = totalWorkers - presentCount;

    // 📋 Tasks
    const totalTasks = await this.taskModel.count({
      where: {
        factory_id: factoryId,
      },
    });

    const completedTasks = await this.taskModel.count({
      where: {
        factory_id: factoryId,
        is_completed: true,
      },
    });

    const pendingTasks = totalTasks - completedTasks;

    // 🚨 Issues
    const openIssues = await this.issueModel.count({
      where: {
        factory_id: factoryId,
        is_resolved: false,
      },
    });

    const resolvedIssues = await this.issueModel.count({
      where: {
        factory_id: factoryId,
        is_resolved: true,
      },
    });

    return this.formatReport(
      reportDate,
      totalWorkers,
      presentCount,
      absentCount,
      totalTasks,
      completedTasks,
      pendingTasks,
      openIssues,
      resolvedIssues,
    );
  }

  private formatReport(
    date: string,
    totalWorkers: number,
    present: number,
    absent: number,
    totalTasks: number,
    completed: number,
    pending: number,
    openIssues: number,
    resolvedIssues: number,
  ) {
    return `
📊 Factory Report (${date})

👷 Attendance:
Total: ${totalWorkers}
Present: ${present}
Absent: ${absent}

📋 Tasks:
Total: ${totalTasks}
Completed: ${completed}
Pending: ${pending}

🚨 Issues:
Open: ${openIssues}
Resolved: ${resolvedIssues}
      `;
  }
}
