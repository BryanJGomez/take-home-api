import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({
    description: 'Public URL of the image to process',
    example: 'https://example.com/photo.jpg',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl: string;

  @ApiProperty({
    description: 'HTTPS webhook URL to receive the result',
    example: 'https://cliente.com/webhook/resultado',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  webhookUrl: string;

  @ApiPropertyOptional({
    description: 'Processing options',
    example: { style: 'professional', format: 'landscape' },
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
