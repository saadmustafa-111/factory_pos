import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInventoryDto {
  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsNumber()
  cement_brand_id?: number;

  @IsNumber()
  supplier_id: number;

  @IsNumber()
  quantity_received: number;

  @IsNumber()
  purchase_price_per_unit: number;

  @IsOptional()
  @IsNumber()
  amount_paid_to_mill?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
