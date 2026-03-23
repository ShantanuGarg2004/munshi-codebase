import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IsBoolean, IsDateString, IsUUID } from 'class-validator';
import { DbService } from 'src/core/services/db-service/db.service';
import { Attendance } from './attendance.schema';

//
// ✅ DTOs (optional for other APIs, not required for WhatsApp flow)
//

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

export class UpdateAttendanceDto {
  @IsBoolean()
  is_present: boolean;
}

//
// ✅ SERVICE
//

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
    user_id: string,
    factory_id: string,
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

  //
  // 🔹 OTHER METHODS (Optional but useful)
  //

  async getAll(): Promise<Attendance[]> {
    return this.attendanceModel.findAll();
  }

  async getById(id: string): Promise<Attendance> {
    const record = await this.attendanceModel.findByPk(id);

    if (!record) {
      throw new NotFoundException('Attendance not found');
    }

    return record;
  }

  async getByFactory(factory_id: string): Promise<Attendance[]> {
    return this.attendanceModel.findAll({
      where: { factory_id },
    });
  }

  async getByUser(user_id: string): Promise<Attendance[]> {
    return this.attendanceModel.findAll({
      where: { user_id },
    });
  }

  async getByDate(factory_id: string, date: string): Promise<Attendance[]> {
    return this.attendanceModel.findAll({
      where: { factory_id, date },
    });
  }

  async updateAttendance(
    id: string,
    dto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    const record = await this.getById(id);

    await record.update(dto);
    return record;
  }

  //
  // 🔹 BULK (for future use)
  //

  async markBulkAttendance(data: CreateAttendanceDto[]): Promise<Attendance[]> {
    try {
      return await this.attendanceModel.bulkCreate(data as any);
    } catch (error) {
      throw new BadRequestException('Bulk attendance failed');
    }
  }
}
