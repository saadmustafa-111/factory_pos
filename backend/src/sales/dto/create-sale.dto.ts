import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSaleItemDto {
  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsNumber()
  cement_brand_id?: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  sale_price_per_unit: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsNumber()
  customer_id?: number;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  customer_address?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsNumber()
  credit_days?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  paid_amount: number;

  @IsOptional()
  @IsNumber()
  loading_charges?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
