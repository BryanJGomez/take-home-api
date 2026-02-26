import { Module } from '@nestjs/common';
import { PROCESSING_DISPATCHER } from './interfaces/processing-dispatcher.interface';
import { MockProcessingDispatcher } from './services/mock-processing-dispatcher.service';

@Module({
  providers: [
    {
      provide: PROCESSING_DISPATCHER,
      useClass: MockProcessingDispatcher,
    },
  ],
  exports: [PROCESSING_DISPATCHER],
})
export class ProcessingModule {}
