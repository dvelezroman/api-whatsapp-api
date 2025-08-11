import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SaveContactDto {
  @ApiProperty({ description: 'Phone number of the contact' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Name of the contact', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Additional information about the contact',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
