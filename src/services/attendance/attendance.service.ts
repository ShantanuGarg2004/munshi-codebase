import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { DbService } from 'src/core/services/db-service/db.service';
import { Attendance } from './attendance.schema';

export class CreateAttendanceDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  factory_id: string;

  @IsDateString()
  date: string;

  @IsBoolean()
  is_present: boolean;
}

@Injectable()
export class AttendanceService {
  private readonly attendanceModel: typeof Attendance;
  constructor(private readonly dbService: DbService) {
    this.attendanceModel = this.dbService.sqlService.Attendance;
  }

  //
  // 🔹 WHATSAPP ENTRY POINT METHOD
  //
  async markAttendance(
    user_id: number,
    factory_id: number,
    is_present: boolean,
  ): Promise<{ message: string; data?: Attendance }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 🔍 Check existing attendance
    const existing = await this.attendanceModel.findOne({
      where: {
        user_id,
        factory_id,
        date: today,
      },
    });

    // 🔄 UPDATE if already exists
    if (existing) {
      await existing.update({ is_present });

      return {
        message: `Attendance updated to ${is_present ? 'PRESENT' : 'ABSENT'}`,
        data: existing,
      };
    }

    // 🆕 CREATE new attendance
    try {
      const record = await this.attendanceModel.create({
        user_id,
        factory_id,
        date: today,
        is_present,
      } as any);

      return {
        message: `Attendance marked as ${is_present ? 'PRESENT' : 'ABSENT'}`,
        data: record,
      };
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new BadRequestException('Attendance already marked for today');
      }
      throw error;
    }
  }
}
