import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CallbackDto } from '../dto/callback.dto';
import { CallbackService } from '../services/callback.service';
import { InternalCallbackGuard } from '../../../common/guards/internal-callback.guard';

@ApiTags('Internal')
@Controller('internal')
export class CallbackController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalCallbackGuard)
  @ApiOperation({
    summary: 'Processing service callback (internal only)',
    description:
      'Called by the internal processing service when a job finishes. Not for external clients.',
  })
  @ApiHeader({
    name: 'X-Internal-Secret',
    description: 'Internal authentication secret',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Callback processed successfully' })
  @ApiResponse({ status: 403, description: 'Invalid internal secret' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async handleCallback(@Body() callbackDto: CallbackDto) {
    await this.callbackService.handleCallback(callbackDto);
    return { received: true };
  }
}
