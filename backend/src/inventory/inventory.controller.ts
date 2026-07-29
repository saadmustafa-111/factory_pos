import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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

  @Put(':id')
  update(@Param('id') id: string, @Body() payload: CreateInventoryDto) {
    return this.inventoryService.update(Number(id), payload);
  }

  @Get('stock')
  stock() {
    return this.inventoryService.stockSummary();
  }

  @Get('history')
  history() {
    return this.inventoryService.history();
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.inventoryService.delete(Number(id));
  }
}
