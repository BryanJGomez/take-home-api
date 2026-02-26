import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { JobsService } from '../services/jobs.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../../../common/interceptors/idempotency.interceptor';
import { User } from '../../users/entities/user.entity';
import {
  CreateJobResponse,
  JobStatusResponse,
} from '../interface/jobs.interface';

@ApiTags('Jobs') // Swagger tag para agrupar endpoints relacionados con jobs
@ApiBearerAuth('api-key') // Indica que este controlador utiliza autenticación por API key
@UseGuards(ApiKeyGuard) // Aplica el guard de API key a todos los endpoints del controlador
@Controller('/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create a new processing job' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key to ensure idempotent requests',
    required: false,
  })
  @ApiResponse({ status: 202, description: 'Job queued successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 402, description: 'Insufficient credits' })
  @ApiResponse({ status: 429, description: 'Concurrency limit exceeded' })
  @ApiResponse({ status: 503, description: 'Processing service unavailable' })
  async create(
    @Body() createJobDto: CreateJobDto,
    @CurrentUser() user: User,
  ): Promise<CreateJobResponse> {
    return this.jobsService.createJob(createJobDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job status by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<JobStatusResponse> {
    return this.jobsService.getJob(id, user.id);
  }
}
