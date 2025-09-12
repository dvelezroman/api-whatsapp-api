import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Name of the group to create',
    example: 'My New Group',
    minLength: 1,
    maxLength: 25,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(25)
  name: string;

  @ApiProperty({
    description:
      'Array of phone numbers to add to the group (without @c.us suffix)',
    example: ['+593995710556', '+593999001087'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  participants: string[];

  @ApiProperty({
    description: 'Optional description for the group',
    example: 'This is a group for project discussions',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
