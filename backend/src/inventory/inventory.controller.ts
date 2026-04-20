import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() payload: CreateInventoryDto) {
    return this.inventoryService.create(payload);
  }

  @Get('stock')
  stock() {
    return this.inventoryService.stockSummary();
  }

  @Get('history')
  history() {
    return this.inventoryService.history();
  }
}
