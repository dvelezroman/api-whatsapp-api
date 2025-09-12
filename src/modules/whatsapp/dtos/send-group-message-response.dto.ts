import { ApiProperty } from '@nestjs/swagger';

export class GroupInfoDto {
  @ApiProperty({
    description: 'Group ID',
    example: '120363405552092242@g.us',
  })
  id: string;

  @ApiProperty({
    description: 'Group name',
    example: 'BitFlow devs',
  })
  name: string;

  @ApiProperty({
    description: 'Number of participants in the group',
    example: 3,
  })
  participantsCount: number;
}

export class SendGroupMessageResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Group information',
    type: GroupInfoDto,
  })
  group: GroupInfoDto;

  @ApiProperty({
    description: 'The message that was sent',
    example: 'Hello everyone! This is a group message.',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent',
    example: '2025-09-12T02:37:16.341Z',
  })
  sentAt: string;
}
