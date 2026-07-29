import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PickupItemDto {
  @IsNumber()
  advance_payment_item_id: number;

  @IsNumber()
  quantity: number; // Quantity to pick up now
}

export class ProcessPickupDto {
  @IsNotEmpty()
  @IsString()
  pickup_date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickupItemDto)
  items: PickupItemDto[];

  @IsOptional()
  @IsNumber()
  additional_payment?: number; // If customer needs to pay more

  @IsOptional()
  @IsString()
  notes?: string;
}
