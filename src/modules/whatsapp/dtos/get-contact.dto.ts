import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetContactDto {
  @ApiProperty({
    description: 'Contact name or ID to search for',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  contactIdentifier: string;

  @ApiProperty({
    description: 'Whether to search by contact ID instead of name',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsString()
  searchById?: boolean;
}
