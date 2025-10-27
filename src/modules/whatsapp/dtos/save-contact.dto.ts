import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SaveContactDto {
  @ApiProperty({
    description: 'Phone number of the contact (any valid WhatsApp number)',
    example: '1234567890',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'Additional information about the contact',
    required: false,
    example: 'Work contact',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
