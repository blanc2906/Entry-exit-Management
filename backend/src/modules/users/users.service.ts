import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "src/schema/user.schema";
import { CreateUserDto } from "./dto/create-user.dto";
import { InjectModel } from "@nestjs/mongoose";
import { ClientMqtt } from "@nestjs/microservices";
import { DELETE_FINGERPRINT, REQUEST_ADD_CARDNUMBER, REQUEST_ADD_FINGERPRINT } from "src/shared/constants/mqtt.constant";
import { AddFingerprintDto } from "./dto/add-fingerprint.dto";
import { AddCardNumberDto } from "./dto/add-cardnumber.dto";
import { AddBulkFingerprintDto } from "./dto/add-bulk-fingerprint.dto";
import { Device, DeviceDocument } from "src/schema/device.schema";
import { UserDevice, UserDeviceDocument } from "src/schema/user-device.schema";
import { WorkSchedule } from "src/schema/workschedule.schema";
import { WorkShift } from "src/schema/workshift.schema";
import { UpdateWorkScheduleDto } from "./dto/update-workschedule.dto";
import { DevicesService } from "../devices/devices.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,

    @InjectModel(UserDevice.name)
    private readonly userdeviceModel: Model<UserDeviceDocument>,

    @InjectModel(WorkSchedule.name)
    private readonly workScheduleModel: Model<WorkSchedule>,

    @InjectModel(WorkShift.name)
    private readonly workShiftModel: Model<WorkShift>,

    @Inject('MQTT_CLIENT')
    private readonly mqttClient: ClientMqtt,

    private readonly devicesService: DevicesService
  ) {}

  getTopic(baseTopic : string, deviceMac : string) {
    return `${baseTopic}/${deviceMac}`;
  }
  async createUser(createUserDto : CreateUserDto) : Promise<UserDocument> {
    try {
      // Check for existing userId
      const existingUserWithId = await this.userModel.findOne({ userId: createUserDto.userId });
      if (existingUserWithId) {
        throw new HttpException('User ID already exists', HttpStatus.BAD_REQUEST);
      }

      // Check for existing email
      const existingUserWithEmail = await this.userModel.findOne({ email: createUserDto.email });
      if (existingUserWithEmail) {
        throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
      }

      const user = new this.userModel({
        ...createUserDto,
        workSchedule: createUserDto.workSchedule ? new Types.ObjectId(createUserDto.workSchedule) : undefined
      });
      return await user.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to create user: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ users: UserDocument[]; total: number; page: number; totalPages: number }> {
    try {
      const query = search
        ? {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { userId: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        this.userModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.userModel.countDocuments(query),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new Error(`Failed to find users : ${error.message}`);
    }
  }

  async removeUser(userId: string): Promise<{ message: string }> {
    try {

      const user = await this.userModel.findById( userId );
      if (!user) {
        throw new Error('User not found');
      }

      try {

        const userDevices = await this.userdeviceModel
          .find({ user: user._id })
          .populate<{ device: DeviceDocument }>('device');

        for (const userDevice of userDevices) {
          const device = userDevice.device;

          await this.mqttClient.emit(
            `${DELETE_FINGERPRINT}/${device.deviceMac}`, 
            JSON.stringify({
              fingerId: userDevice.fingerId
            })
          );
        }

        await this.userdeviceModel.deleteMany({ user: user._id });

        await this.deviceModel.updateMany(
          { users: user._id },
          { $pull: { users: user._id } }
        );

        await this.userModel.deleteOne({ _id: user._id });

        return { 
          message: `User deleted successfully from system and ${userDevices.length} devices` 
        };
      } catch (error) {
        throw error;
      }
    } catch (error) {
      throw new Error(`Failed to remove user: ${error.message}`);
    }
  }

  async findUserById(userId: string) : Promise<UserDocument> {
    try {
      return await this.userModel.findOne({userId});
    } catch (error) {
      throw new Error(`Failed to find user : ${error.message}`);
    }
  }

  async findUserByEmail(email: string) : Promise<UserDocument> {
    try {
      return await this.userModel.findOne({email});
    } catch (error) {
      throw new Error(`Failed to find user : ${error.message}`);
    }
  }

  async requestAddBulkFingerprint(userId: string, deviceIds: string[]) {
    try {
      // Kiểm tra user có tồn tại không
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Kiểm tra tất cả thiết bị có tồn tại và online không
      const devices = await this.deviceModel.find({ 
        _id: { $in: deviceIds } 
      });

      if (devices.length !== deviceIds.length) {
        throw new HttpException('Some devices not found', HttpStatus.NOT_FOUND);
      }

      const offlineDevices = devices.filter(device => device.status !== "online");
      if (offlineDevices.length > 0) {
        throw new HttpException(
          `Devices offline: ${offlineDevices.map(d => d.deviceMac).join(', ')}`, 
          HttpStatus.BAD_REQUEST
        );
      }

      // Lấy thiết bị đầu tiên để thực hiện thêm vân tay
      const firstDevice = devices[0];
      
      // Gửi request đến thiết bị đầu tiên với thông tin về tất cả thiết bị
      await this.mqttClient.emit(
        this.getTopic(REQUEST_ADD_FINGERPRINT, firstDevice.deviceMac), 
        JSON.stringify({
          userId: userId,
          targetDeviceIds: deviceIds
        })
      );

      return {
        message: `Request sent to device ${firstDevice.deviceMac} for fingerprint registration`,
        targetDevices: devices.map(d => ({ id: d._id, deviceMac: d.deviceMac }))
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to request bulk fingerprint: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addFingerprint(addFingerprintDto: AddFingerprintDto): Promise<{ user: UserDocument; message: string }> {
    try {
      console.log('Received addFingerprintDto:', JSON.stringify(addFingerprintDto));
      
      // Validate userId
      if (!addFingerprintDto.userId || typeof addFingerprintDto.userId !== 'string') {
        throw new Error('Invalid userId provided');
      }

      const user = await this.userModel.findById(addFingerprintDto.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const device = await this.deviceModel.findOne({ deviceMac: addFingerprintDto.deviceMac });
      if (!device) {
        throw new Error('Device not found');
      }

      user.fingerTemplate = addFingerprintDto.fingerTemplate;
      user.updatedAt = new Date();

      const userDevice = new this.userdeviceModel({
        user: user._id,
        device: device._id as Types.ObjectId,
        fingerId: addFingerprintDto.fingerId
      });
      await userDevice.save();

      if (!user.devices.includes(device._id as Types.ObjectId)) {
        user.devices.push(device._id as Types.ObjectId);
      }

      if (!device.users.includes(user._id as Types.ObjectId)) {
        device.users.push(user._id as Types.ObjectId);
        await device.save();
      }

      // Nếu có targetDeviceIds, thực hiện import vào các thiết bị khác
      if (addFingerprintDto.targetDeviceIds && addFingerprintDto.targetDeviceIds.length > 0) {
        console.log('Processing targetDeviceIds:', addFingerprintDto.targetDeviceIds);
        const otherDeviceIds = addFingerprintDto.targetDeviceIds.filter(id => id !== device._id.toString());
        
        for (const deviceId of otherDeviceIds) {
          try {
            await this.devicesService.addUserToDevice(deviceId, user._id.toString());
            console.log(`Successfully added user to device ${deviceId}`);
          } catch (error) {
            console.error(`Failed to add user to device ${deviceId}:`, error);
            // Continue with other devices even if one fails
          }
        }
      }

      const savedUser = await user.save();
      
      const successMessage = `Thêm vân tay thành công cho nhân viên ${user.name}`;
      
      return {
        user: savedUser,
        message: successMessage
      };
    } catch (error) {
      console.error('Error in addFingerprint:', error);
      throw new Error(`Failed to add fingerprint: ${error.message}`);
    }
  }

  async getUserFingerprint(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        userId: String(user._id),
        templateData : user.fingerTemplate
      };
    } catch (error) {
      throw new Error(`Failed to get user fingerprint: ${error.message}`);
    }
  }

  async getUserByFingerId(fingerId: number, deviceId : string): Promise<UserDocument> {
    try {

      const userDevice = await this.userdeviceModel.findOne({
        fingerId,
        device: new Types.ObjectId(deviceId)
      }).populate<{ user: UserDocument }>('user');

      if (!userDevice) {
        throw new Error('User not found with this fingerprint on this device');
      }

      return userDevice.user;
    } catch (error) {
      throw new Error(`Failed to get user by fingerprint: ${error.message}`);
    }
  }

  async requestAddCardNumber(userId: string, deviceId : string){
    const device = await this.deviceModel.findById(deviceId);
    if(!device){
      throw new Error('Device not found');
    }

    if (device.status !== "online") {
      throw new HttpException('Device is offline, cannot connect', HttpStatus.BAD_REQUEST);
    }
    const deviceMac = device.deviceMac;

    await this.mqttClient.emit(this.getTopic(REQUEST_ADD_CARDNUMBER, deviceMac), userId);
  }

  async addCardNumber(addCardNumberDto : AddCardNumberDto): Promise<{ user: UserDocument; message: string }> {
    try {
      const user = await this.userModel.findById(addCardNumberDto.userId);
      
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const device = await this.deviceModel.findOne({ deviceMac: addCardNumberDto.deviceMac });
      if (!device) {
        throw new HttpException('Device not found', HttpStatus.NOT_FOUND);
      }

      // Check if card number already exists
      const existingUserWithCard = await this.userModel.findOne({ 
        cardNumber: addCardNumberDto.cardNumber,
        _id: { $ne: user._id } // Exclude current user from check
      });
      
      if (existingUserWithCard) {
        throw new HttpException('Card number already exists with another user', HttpStatus.BAD_REQUEST);
      }

      user.cardNumber = addCardNumberDto.cardNumber;
      user.updatedAt = new Date();

      if (!device.users.includes(user._id as Types.ObjectId)) {
        device.users.push(user._id as Types.ObjectId);
        await device.save(); // Save the device document with the updated users array
      }

      const savedUser = await user.save();
      
      // Gửi thông báo thành công
      const successMessage = `Thêm thẻ thành công cho nhân viên ${user.name}`;
      
      return {
        user: savedUser,
        message: successMessage
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to add card number: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserByCardNumber(cardNumber: string): Promise<UserDocument> {  
    const user = await this.userModel.findOne({ cardNumber });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async getUserWorkSchedule(userId: string) {
    try {
      const user = await this.userModel.findById(userId)
        .populate({
          path: 'workSchedule',
          populate: {
            path: 'shifts',
            model: 'WorkShift'
          }
        });

      if (!user) {
        throw new Error('User not found');
      }

      return user.workSchedule;
    } catch (error) {
      throw new Error(`Failed to get user work schedule: ${error.message}`);
    }
  }

  async updateUserWorkSchedule(userId: string, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Kiểm tra workSchedule có tồn tại không
      const workSchedule = await this.workScheduleModel.findById(updateWorkScheduleDto.workSchedule);
      if (!workSchedule) {
        throw new Error('Work schedule not found');
      }

      // Nếu có cập nhật shifts
      if (updateWorkScheduleDto.shifts) {
        // Kiểm tra tất cả các shift có tồn tại không
        for (const shiftData of updateWorkScheduleDto.shifts) {
          const shift = await this.workShiftModel.findById(shiftData.shift);
          if (!shift) {
            throw new Error(`Work shift not found: ${shiftData.shift}`);
          }
        }

        // Cập nhật shifts trong workSchedule
        workSchedule.shifts = new Map();
        for (const shiftData of updateWorkScheduleDto.shifts) {
          workSchedule.shifts.set(shiftData.day, new Types.ObjectId(shiftData.shift.toString()));
        }
        await workSchedule.save();
      }

      // Cập nhật workSchedule cho user
      user.workSchedule = new Types.ObjectId(workSchedule._id.toString());
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to update user work schedule: ${error.message}`);
    }
  }

  async removeUserWorkSchedule(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.workSchedule = null;
      return await user.save();
    } catch (error) {
      throw new Error(`Failed to remove user work schedule: ${error.message}`);
    }
  }
}
