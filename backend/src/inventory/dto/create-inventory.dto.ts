import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum InventoryEntryType {
  PURCHASE = 'purchase',
  OPENING = 'opening',
}

export class CreateInventoryDto {
  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsNumber()
  cement_brand_id?: number;

  @IsOptional()
  @IsNumber()
  supplier_id?: number;

  @IsOptional()
  @IsEnum(InventoryEntryType)
  entry_type?: InventoryEntryType;

  @IsNumber()
  quantity_received: number;

  @IsNumber()
  purchase_price_per_unit: number;

  @IsOptional()
  @IsNumber()
  amount_paid_to_mill?: number;

  @IsOptional()
  @IsNumber()
  amount_received_from_mill?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  pickup_date?: string;

  @IsOptional()
  @IsDateString()
  delivery_date?: string;

  @IsOptional()
  @IsString()
  delivery_location?: string;

  @IsOptional()
  @IsString()
  transport_details?: string;

  @IsOptional()
  @IsNumber()
  credit_days?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
