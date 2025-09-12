import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateDiffusionGroupDto {
  @ApiProperty({
    description: 'Name of the diffusion group (broadcast list) to create',
    example: 'Marketing Broadcast',
    minLength: 1,
    maxLength: 25,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(25)
  name: string;

  @ApiProperty({
    description:
      'Array of phone numbers to add to the diffusion group (without @c.us suffix)',
    example: ['+593995710556', '+593999001087', '+593988541665'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participants: string[];

  @ApiProperty({
    description: 'Optional description for the diffusion group',
    example: 'Broadcast list for marketing campaigns',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
