import { Body, Controller, Get, Post, Param, Delete, Patch } from '@nestjs/common';
import { WorkScheduleService } from './workschedule.service'; 
import { CreateWorkScheduleDto } from './dto/create-workschedule.dto';

@Controller('workschedules')
export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  @Post()
  async create(@Body() dto: CreateWorkScheduleDto) {
    return this.workScheduleService.create(dto);
  }

  @Get()
  async findAll() {
    return this.workScheduleService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workScheduleService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWorkScheduleDto>) {
    return this.workScheduleService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.workScheduleService.remove(id);
    return { message: 'Deleted successfully' };
  }
} 