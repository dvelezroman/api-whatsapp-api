import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendGroupMessageDto {
  @ApiProperty({
    description: 'Group name or ID to send message to',
    example: 'My Work Group',
  })
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @ApiProperty({
    description: 'Message to be sent to the group',
    example: 'Hello everyone! This is a group message.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Whether to search by group ID instead of name',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsString()
  searchById?: boolean;
}
