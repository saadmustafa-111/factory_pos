export type SaleStatus = 'paid' | 'partial' | 'pending';

export interface Product {
  id: number;
  name: string;
  category: 'sariya' | 'rings' | 'wire' | 'cement';
  type: 'thin' | 'thick' | 'brand_name' | 'standard';
  unit: 'kg' | 'piece' | 'bag' | 'bundle' | 'maund' | 'ton';
}

export interface CementBrand {
  id: number;
  brand_name: string;
}

export interface StockRow {
  product_id: number;
  product_name?: string;
  unit?: string;
  current_stock?: number;
  stock?: number;
  product?: Product;
}

export interface Sale {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: SaleStatus;
}
