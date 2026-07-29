import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdvancePaymentsService } from './advance-payments.service';
import { CreateAdvancePaymentDto } from './dto/create-advance-payment.dto';
import { ProcessPickupDto } from './dto/process-pickup.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('advance-payments')
@UseGuards(JwtAuthGuard)
export class AdvancePaymentsController {
  constructor(
    private readonly advancePaymentsService: AdvancePaymentsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateAdvancePaymentDto) {
    return this.advancePaymentsService.create(createDto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.advancePaymentsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advancePaymentsService.findOne(+id);
  }

  @Post(':id/pickup')
  processPickup(@Param('id') id: string, @Body() pickupDto: ProcessPickupDto) {
    return this.advancePaymentsService.processPickup(+id, pickupDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.advancePaymentsService.cancel(+id);
  }
}
