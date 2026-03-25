import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Issue } from './issues.schema';
import { DbService } from 'src/core/services/db-service/db.service';

@Injectable()
export class IssueService {
  private readonly IssueModel: typeof Issue;

  constructor(private readonly dbService: DbService) {
    this.IssueModel = this.dbService.sqlService.Issue;
  }

  async createIssue(userId: number, factory_id: number, message: string) {
    return await this.IssueModel.create({
      reported_by: userId,
      factory_id,
      message,
    });
  }

  async resolveIssue(issueId: string) {
    const issue = await this.IssueModel.findByPk(issueId);

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    if (issue.is_resolved)
      throw new BadRequestException('This issue is already resolved');

    await issue.update({ is_resolved: true });

    return { message: 'Issue resolved' };
  }

  async getActiveIssues(factory_id: number) {
    return this.IssueModel.findAll({
      where: {
        factory_id,
        is_resolved: false,
      },
    });
  }
}
