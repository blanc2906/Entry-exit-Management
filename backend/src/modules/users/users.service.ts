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
import { UpdateUserDto } from "./dto/update-user.dto";
import { DeleteFingerprintDto } from "./dto/delete-fingerprint.dto";
import { DeleteCardDto } from "./dto/delete-card.dto";
import { Device, DeviceDocument } from "src/schema/device.schema";
import { UserDevice, UserDeviceDocument } from "src/schema/user-device.schema";
import { WorkSchedule } from "src/schema/workschedule.schema";
import { WorkShift } from "src/schema/workshift.schema";
import { UpdateWorkScheduleDto } from "./dto/update-workschedule.dto";
import { DevicesService } from "../devices/devices.service";
import { MqttService } from "../mqtt/mqtt.service";
import * as XLSX from 'xlsx';
import type { Multer } from 'multer';

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

    private readonly devicesService: DevicesService,
    private readonly mqttService: MqttService
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

  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Kiểm tra email mới có bị trùng không (nếu có cập nhật email)
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUserWithEmail = await this.userModel.findOne({ 
          email: updateUserDto.email,
          _id: { $ne: userId } // Loại trừ user hiện tại
        });
        if (existingUserWithEmail) {
          throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
        }
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData: any = {
        ...updateUserDto,
        updatedAt: new Date()
      };

      // Xử lý workSchedule nếu có
      if (updateUserDto.workSchedule) {
        updateData.workSchedule = new Types.ObjectId(updateUserDto.workSchedule);
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to update user: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteFingerprint(deleteFingerprintDto: DeleteFingerprintDto): Promise<{ message: string; deletedDevices: string[] }> {
    try {
      const user = await this.userModel.findById(deleteFingerprintDto.userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Lấy tất cả thiết bị có vân tay của user
      const userDevices = await this.userdeviceModel
        .find({ user: user._id })
        .populate<{ device: DeviceDocument }>('device');

      if (userDevices.length === 0) {
        throw new HttpException('No fingerprint found for this user', HttpStatus.NOT_FOUND);
      }

      const deletedDevices: string[] = [];

      // Xóa vân tay từ tất cả thiết bị
      for (const userDevice of userDevices) {
        const device = userDevice.device;
        
        try {
          // Gửi lệnh xóa vân tay đến thiết bị
         await this.mqttService.deleteFingerprint(
          device.deviceMac,
          userDevice.fingerId,
        )
          
          deletedDevices.push(device.deviceMac);
        } catch (error) {
          console.error(`Failed to delete fingerprint from device ${device.deviceMac}:`, error);
          // Continue with other devices even if one fails
        }
      }

      // Xóa tất cả records từ database
      await this.userdeviceModel.deleteMany({ user: user._id });

      // Cập nhật user document
      user.fingerTemplate = null;
      user.updatedAt = new Date();
      await user.save();

      // Cập nhật tất cả device documents
      for (const userDevice of userDevices) {
        await this.deviceModel.updateOne(
          { _id: userDevice.device._id },
          { $pull: { users: user._id } }
        );
      }

      const message = `Đã xóa tất cả vân tay của ${user.name} từ ${deletedDevices.length} thiết bị`;

      return {
        message,
        deletedDevices
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to delete fingerprint: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteCard(deleteCardDto: DeleteCardDto): Promise<{ message: string }> {
    try {
      const user = await this.userModel.findById(deleteCardDto.userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.cardNumber) {
        throw new HttpException('User does not have a card number', HttpStatus.BAD_REQUEST);
      }

      // Use $unset to remove the cardNumber field completely, avoiding sparse index issues
      await this.userModel.findByIdAndUpdate(
        deleteCardDto.userId,
        { 
          $unset: { cardNumber: 1 },
          updatedAt: new Date()
        }
      );

      return {
        message: `Đã xóa thẻ của ${user.name} thành công`
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to delete card: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async importUsersFromExcel(file: any) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    for (const row of data) {
      try {
        const userDto = {
          userId: row['userId'] || row['Mã nhân viên'],
          name: row['name'] || row['Tên'],
          email: row['email'] || row['Email'],
          createdAt: new Date(),
        };
        await this.createUser(userDto);
        results.push({ userId: userDto.userId, status: 'success' });
      } catch (error) {
        results.push({ userId: row['userId'] || row['Mã nhân viên'], status: 'failed', error: error.message });
      }
    }
    return results;
  }

}
