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
import { ManagedOptionScope } from './entities/managed-option.entity';
import { OptionsService } from './options.service';

@UseGuards(JwtAuthGuard)
@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get(':scope')
  list(@Param('scope') scope: ManagedOptionScope) {
    return this.optionsService.findAll(scope);
  }

  @Post(':scope')
  create(@Param('scope') scope: ManagedOptionScope, @Body() body: { name: string }) {
    return this.optionsService.create(scope, body.name);
  }

  @Patch(':scope/:id')
  update(
    @Param('scope') scope: ManagedOptionScope,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
  ) {
    return this.optionsService.update(scope, id, body.name);
  }

  @Delete(':scope/:id')
  remove(
    @Param('scope') scope: ManagedOptionScope,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.optionsService.remove(scope, id);
  }
}
