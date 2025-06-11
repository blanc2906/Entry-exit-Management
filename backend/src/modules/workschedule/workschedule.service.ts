import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkSchedule } from '../../schema/workschedule.schema';
import { CreateWorkScheduleDto } from '../workschedule/dto/create-workschedule.dto';

@Injectable()
export class WorkScheduleService {
  constructor(
    @InjectModel(WorkSchedule.name)
    private readonly workScheduleModel: Model<WorkSchedule>,
  ) {}

  async create(createDto: CreateWorkScheduleDto): Promise<WorkSchedule> {
    const created = new this.workScheduleModel(createDto);
    return created.save();
  }

  async findAll(): Promise<WorkSchedule[]> {
    return this.workScheduleModel.find().populate('shifts').exec();
  }

  async findOne(id: string): Promise<WorkSchedule> {
    const found = await this.workScheduleModel.findById(id).populate('shifts').exec();
    if (!found) throw new NotFoundException('WorkSchedule not found');
    return found;
  }

  async update(id: string, updateDto: Partial<CreateWorkScheduleDto>): Promise<WorkSchedule> {
    const updated = await this.workScheduleModel.findByIdAndUpdate(id, updateDto, { new: true }).populate('shifts').exec();
    if (!updated) throw new NotFoundException('WorkSchedule not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.workScheduleModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('WorkSchedule not found');
  }
} 