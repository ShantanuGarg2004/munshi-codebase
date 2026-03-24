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

  async createIssue(userId: string, factoryId: string, message: string) {
    return await this.IssueModel.create({
      reported_by: userId,
      factory_id: factoryId,
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

  async getActiveIssues(factoryId: string) {
    return this.IssueModel.findAll({
      where: {
        factory_id: factoryId,
        is_resolved: false,
      },
    });
  }
}
