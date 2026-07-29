import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AdvancePaymentItemDto {
  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsNumber()
  cement_brand_id?: number;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsNumber()
  rate_per_unit: number;
}

export class CreateAdvancePaymentDto {
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

  @IsNotEmpty()
  @IsString()
  payment_date: string;

  @IsNumber()
  paid_amount: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  expected_pickup_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvancePaymentItemDto)
  items: AdvancePaymentItemDto[];
}
