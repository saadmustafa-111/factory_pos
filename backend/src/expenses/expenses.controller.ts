import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type CreateExpenseDto, ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  /** GET /expenses?from=2026-04-01&to=2026-04-28 */
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  /** GET /expenses/today */
  @Get('today')
  findToday() {
    return this.service.findToday();
  }

  /** GET /expenses/today-totals */
  @Get('today-totals')
  todayTotals() {
    return this.service.todayTotals();
  }

  /** POST /expenses */
  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  /** PATCH /expenses/:id */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateExpenseDto>,
  ) {
    return this.service.update(id, dto);
  }

  /** DELETE /expenses/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
