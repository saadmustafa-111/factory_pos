import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCementBrandDto } from './dto/create-cement-brand.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  getProducts() {
    return this.productsService.findAllActive();
  }

  @Get('cement-brands')
  getCementBrands() {
    return this.productsService.getCementBrands();
  }

  @Post('cement-brands')
  addCementBrand(@Body() payload: CreateCementBrandDto) {
    return this.productsService.addCementBrand(payload);
  }

  @Delete('cement-brands/:id')
  removeCementBrand(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.removeCementBrand(id);
  }
}
