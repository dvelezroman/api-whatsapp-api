import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SendDto {
  @ApiProperty({
    description: 'Phone number of receiver (any valid WhatsApp number)',
  })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Message to be sent.' })
  @IsString()
  message: string;
}
