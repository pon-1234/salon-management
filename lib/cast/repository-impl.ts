import { MockRepository, generateMockData } from '../shared';
import { Cast, CastSchedule } from './types';
import { CastRepository } from './repository';

const generateCastData = (index: number): Omit<Cast, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: index === 0 ? "みるく" : `キャスト${index + 1}`,
  nameKana: index === 0 ? "みるく" : `キャスト${index + 1}`,
  age: 18 + Math.floor(Math.random() * 15),
  height: 150 + Math.floor(Math.random() * 20),
  bust: ["A", "B", "C", "D", "E", "F", "G", "H"][Math.floor(Math.random() * 8)],
  waist: 55 + Math.floor(Math.random() * 15),
  hip: 80 + Math.floor(Math.random() * 20),
  type: ["カワイイ系", "セクシー系", "お姉さん系", "癒し系"][Math.floor(Math.random() * 4)],
  image: "https://rimane.net/images/tyrano-move-image01.jpg",
  description: "明るく元気な性格で、お客様を楽しませることが得意です。マッサージの技術も高く、リピーターの多いキャストです。",
  netReservation: Math.random() > 0.3,
  specialDesignationFee: Math.random() > 0.7 ? 3000 + Math.floor(Math.random() * 7000) : null,
  regularDesignationFee: Math.random() > 0.5 ? 1000 + Math.floor(Math.random() * 4000) : null,
  workStatus: Math.random() > 0.3 ? "出勤" : "未出勤",
  courseTypes: ["イベントコース", "基本コース", "プレミアムコース"].slice(0, 1 + Math.floor(Math.random() * 2)),
  workStart: new Date(2023, 0, 1, 10, 0),
  workEnd: new Date(2023, 0, 1, 22, 0),
  appointments: [],
});

export class CastRepositoryImpl extends MockRepository<Cast> implements CastRepository {
  constructor() {
    super(generateMockData(5, generateCastData));
  }

  async getCastSchedule(castId: string, startDate: Date, endDate: Date): Promise<CastSchedule[]> {
    // This is a mock implementation. In a real application, this would fetch the actual schedule from a database.
    const schedule: CastSchedule[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      schedule.push({
        castId,
        date: new Date(currentDate),
        startTime: new Date(currentDate.setHours(10, 0, 0, 0)),
        endTime: new Date(currentDate.setHours(22, 0, 0, 0)),
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return schedule;
  }

  async updateCastSchedule(castId: string, schedule: CastSchedule[]): Promise<void> {
    // In a real application, this would update the schedule in a database
    console.log(`Updating schedule for cast ${castId}`, schedule);
  }
}
