import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetDiffusionContactsDto {
  @ApiProperty({
    description: 'Diffusion group name or ID to get contacts from',
    example: 'Broadcast List 1',
  })
  @IsString()
  @IsNotEmpty()
  diffusionName: string;

  @ApiProperty({
    description: 'Whether to search by diffusion ID instead of name',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsString()
  searchById?: boolean;
}
