import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CallbackDto {
  @ApiProperty({
    description: 'The job ID',
    example: 'a1b2c3d4',
  })
  @IsNotEmpty()
  @IsString()
  jobId: string;

  @ApiProperty({
    description: 'Final status of the processing job',
    enum: ['completed', 'failed'],
    example: 'completed',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['completed', 'failed'])
  status: 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'URL of the processed result (only when status is completed)',
    example: 'https://storage.example.com/resultado.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  resultUrl?: string;

  @ApiPropertyOptional({
    description: 'Error details (only when status is failed)',
    example: { code: 'PROCESSING_FAILED', message: 'Something went wrong' },
  })
  @IsOptional()
  @IsObject()
  error?: {
    code: string;
    message: string;
  };
}
