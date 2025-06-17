import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../schema/user.schema';
import { Device } from '../../schema/device.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Device.name) private deviceModel: Model<Device>,
  ) {}

  async getStats() {
    // Get total counts
    const [totalUsers, totalDevices] = await Promise.all([
      this.userModel.countDocuments(),
      this.deviceModel.countDocuments(),
    ]);

    // Get previous day counts for growth rate calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const [prevDayUsers, prevDayDevices] = await Promise.all([
      this.userModel.countDocuments({ createdAt: { $lt: yesterday } }),
      this.deviceModel.countDocuments({ createdAt: { $lt: yesterday } }),
    ]);

    // Calculate growth rates
    const userGrowthRate = prevDayUsers === 0 ? 0 : ((totalUsers - prevDayUsers) / prevDayUsers) * 100;
    const deviceGrowthRate = prevDayDevices === 0 ? 0 : ((totalDevices - prevDayDevices) / prevDayDevices) * 100;

    return {
      totalUsers,
      totalDevices,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      deviceGrowthRate: Math.round(deviceGrowthRate * 100) / 100
    };
  }
} 