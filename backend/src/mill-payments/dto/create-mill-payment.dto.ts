import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMillPaymentDto {
  @IsNumber()
  supplier_id: number;

  @IsNumber()
  inventory_id: number;

  @IsNumber()
  amount_paid: number;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
