import { Module } from '@nestjs/common';
import { FactoryController, FactoryService } from './factories.service';

@Module({
  controllers: [FactoryController],
  providers: [FactoryService],
})
export class FactoryModule {}
