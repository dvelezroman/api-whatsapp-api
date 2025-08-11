import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetGroupContactsDto {
  @ApiProperty({
    description: 'Group name or ID to get contacts from',
    example: 'My Work Group',
  })
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @ApiProperty({
    description: 'Whether to search by group ID instead of name',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsString()
  searchById?: boolean;
}
