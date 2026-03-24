import { Module } from '@nestjs/common';
import { FactoryController, FactoryService } from './factories.service';

@Module({
  controllers: [FactoryController],
  providers: [FactoryService],
  exports: [FactoryService],
})
export class FactoryModule {}
