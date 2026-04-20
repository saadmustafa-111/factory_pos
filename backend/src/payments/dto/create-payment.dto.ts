import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  sale_id: number;

  @IsOptional()
  @IsNumber()
  customer_id?: number;

  @IsNumber()
  amount_paid: number;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
