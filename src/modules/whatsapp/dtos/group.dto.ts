import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty({ description: 'Participant ID' })
  id: string;

  @ApiProperty({ description: 'Participant name' })
  name: string;

  @ApiProperty({ description: 'Whether the participant is an admin' })
  isAdmin: boolean;

  @ApiProperty({ description: 'Whether the participant is a super admin' })
  isSuperAdmin: boolean;
}

export class GroupDto {
  @ApiProperty({ description: 'Group ID' })
  id: string;

  @ApiProperty({ description: 'Group name' })
  name: string;

  @ApiProperty({ description: 'Group description' })
  description: string;

  @ApiProperty({ description: 'Number of participants in the group' })
  participantsCount: number;

  @ApiProperty({ description: 'Whether this is a group chat' })
  isGroup: boolean;

  @ApiProperty({ description: 'Group creation date', required: false })
  createdAt: string | null;

  @ApiProperty({ description: 'List of participants', type: [ParticipantDto] })
  participants: ParticipantDto[];
}

export class GroupsResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Total number of groups' })
  totalGroups: number;

  @ApiProperty({ description: 'List of groups', type: [GroupDto] })
  groups: GroupDto[];
}
