import { Module } from '@nestjs/common';
import { PROCESSING_DISPATCHER } from './interfaces/processing-dispatcher.interface';
import { MockProcessingDispatcher } from './services/mock-processing-dispatcher.service';
import { ConfigurationModule } from '../../config/configuration.module';
import { HttpModule } from '../../common/http/http.module';

@Module({
  imports: [ConfigurationModule, HttpModule],
  providers: [
    {
      provide: PROCESSING_DISPATCHER,
      useClass: MockProcessingDispatcher,
    },
  ],
  exports: [PROCESSING_DISPATCHER],
})
export class ProcessingModule {}
