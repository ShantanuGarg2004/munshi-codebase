import { Module } from '@nestjs/common';
import { IssueService } from './issues.service';

@Module({
  providers: [IssueService],
  exports: [IssueService],
})
export class IssueModule {}
