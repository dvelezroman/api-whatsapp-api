import { ApiProperty } from '@nestjs/swagger';

export class CreatedGroupInfoDto {
  @ApiProperty({
    description: 'Group ID in WhatsApp format',
    example: '120363405552092242@g.us',
  })
  id: string;

  @ApiProperty({
    description: 'Group name',
    example: 'My New Group',
  })
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'This is a group for project discussions',
  })
  description: string;

  @ApiProperty({
    description: 'Number of participants in the group',
    example: 3,
  })
  participantsCount: number;

  @ApiProperty({
    description: 'Whether this is a group chat',
    example: true,
  })
  isGroup: boolean;

  @ApiProperty({
    description: 'Group creation timestamp',
    example: '2025-09-12T02:37:16.341Z',
  })
  createdAt: string;
}

export class CreateGroupResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Group created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Created group information',
    type: CreatedGroupInfoDto,
  })
  group: CreatedGroupInfoDto;
}
