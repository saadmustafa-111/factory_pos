import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCementBrandDto {
  @IsString()
  brand_name: string;

  @IsOptional()
  @IsNumber()
  supplier_id?: number;
}
