import { ApiProperty } from '@nestjs/swagger';

export class DiffusionGroupDto {
  @ApiProperty({ description: 'Diffusion group ID' })
  id: string;

  @ApiProperty({ description: 'Diffusion group name' })
  name: string;

  @ApiProperty({ description: 'Diffusion group description' })
  description: string;

  @ApiProperty({ description: 'Number of participants in the diffusion group' })
  participantsCount: number;

  @ApiProperty({ description: 'Whether this is a group chat' })
  isGroup: boolean;

  @ApiProperty({ description: 'Whether this is a broadcast list' })
  isBroadcast: boolean;

  @ApiProperty({ description: 'Group creation date', required: false })
  createdAt: string | null;

  @ApiProperty({ description: 'List of participants', type: [Object] })
  participants: Array<{
    id: string;
    name: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }>;
}

export class DiffusionGroupsResponseDto {
  @ApiProperty({ description: 'Response status' })
  status: string;

  @ApiProperty({ description: 'Total number of diffusion groups' })
  totalDiffusionGroups: number;

  @ApiProperty({
    description: 'List of diffusion groups',
    type: [DiffusionGroupDto],
  })
  diffusionGroups: DiffusionGroupDto[];
}
