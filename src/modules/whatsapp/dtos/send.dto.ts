import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SendDto {
  @ApiProperty({ description: 'Number of receiver' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Message to be sent.' })
  @IsString()
  message: string;
}
