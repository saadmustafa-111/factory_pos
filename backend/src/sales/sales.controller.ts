import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() payload: CreateSaleDto) {
    return this.salesService.create(payload);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() payload: CreateSaleDto) {
    return this.salesService.update(id, payload);
  }

  @Get()
  list(@Query('status') status?: string) {
    return this.salesService.findAll(status);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }
}
