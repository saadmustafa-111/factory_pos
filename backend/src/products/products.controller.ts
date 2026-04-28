import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
    return this.productsService.findAll();
  }

  @Post('products')
  addProduct(@Body() body: { name: string; category: string; type: string; unit: string }) {
    return this.productsService.addProduct(body);
  }

  @Patch('products/:id/unit')
  updateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { unit: string },
  ) {
    return this.productsService.updateProductUnit(id, body.unit);
  }

  @Delete('products/:id')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.removeProduct(id);
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
