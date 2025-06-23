import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User } from "src/schema/user.schema";
import { FindAllHistoryDto } from "../dto/find-all-history.dto";

@Injectable()
export class HistoryQueryService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

    async buildFindAllQuery(params: FindAllHistoryDto): Promise<any> {
        const { search, userId, startDate, endDate } = params;
        const filters = [];

        // Handle text search first, as it affects which users we're interested in.
        if (search) {
            const matchingUsers = await this.userModel.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            const userIds = matchingUsers.map(user => user._id);
            
            // If search term finds no users, the query should return no history.
            if (userIds.length === 0) {
                return { _id: null }; // Return a query that matches nothing
            }
            filters.push({ user: { $in: userIds } });
        }

        // Handle filtering by a specific user from the dropdown
        if (userId) {
            // Create an $or condition to match user by ObjectId or by string,
            // making the query robust against inconsistent data types.
            filters.push({
                $or: [
                    { user: new Types.ObjectId(userId) },
                    { user: userId as any } // Fallback to match as a string
                ]
            });
        }

        

        if (startDate || endDate) {
            const dateQuery: any = {};
            if (startDate) {
                dateQuery.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                dateQuery.$lt = end;
            }
            filters.push({ date: dateQuery });
        }

        return filters.length > 0 ? { $and: filters } : {};
    }

    buildExportQuery(startDate?: string, endDate?: string, userId?: string): any {
        const query: any = {};
        
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (userId) {
            if (/^[0-9a-fA-F]{24}$/.test(userId)) {
                query.$or = [
                    { user: new Types.ObjectId(userId) },
                    { user: userId }
                ];
            } else {
                // Handle userId as employee code - will be resolved in service
                query.userId = userId;
            }
        }
        
        return query;
    }
 
} 