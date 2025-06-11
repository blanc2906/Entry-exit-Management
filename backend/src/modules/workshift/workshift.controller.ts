import { Body, Controller, Get, Post, Param, Delete, Patch } from '@nestjs/common';
import { WorkShiftService } from './workshift.service';
import { CreateWorkShiftDto } from './dto/create-workshift.dto';

@Controller('workshifts')
export class WorkShiftController {
  constructor(private readonly workShiftService: WorkShiftService) {}

  @Post()
  async create(@Body() dto: CreateWorkShiftDto) {
    return this.workShiftService.create(dto);
  }

  @Get()
  async findAll() {
    return this.workShiftService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workShiftService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWorkShiftDto>) {
    return this.workShiftService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.workShiftService.remove(id);
    return { message: 'Deleted successfully' };
  }
} 