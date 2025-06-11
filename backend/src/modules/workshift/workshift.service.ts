import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkShift } from '../../schema/workshift.schema';
import { CreateWorkShiftDto } from './dto/create-workshift.dto';

@Injectable()
export class WorkShiftService {
  constructor(
    @InjectModel(WorkShift.name)
    private readonly workShiftModel: Model<WorkShift>,
  ) {}

  async create(createWorkShiftDto: CreateWorkShiftDto): Promise<WorkShift> {
    const created = new this.workShiftModel(createWorkShiftDto);
    return created.save();
  }

  async findAll(): Promise<WorkShift[]> {
    return this.workShiftModel.find().exec();
  }

  async findOne(id: string): Promise<WorkShift> {
    const found = await this.workShiftModel.findById(id).exec();
    if (!found) throw new NotFoundException('WorkShift not found');
    return found;
  }

  async update(id: string, updateDto: Partial<CreateWorkShiftDto>): Promise<WorkShift> {
    const updated = await this.workShiftModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!updated) throw new NotFoundException('WorkShift not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.workShiftModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('WorkShift not found');
  }
} 