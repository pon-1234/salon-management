import { BaseEntity } from '../shared';

export interface Cast extends BaseEntity {
  name: string;
  nameKana: string;
  age: number;
  height: number;
  bust: string;
  waist: number;
  hip: number;
  type: string;
  image: string; // メイン画像（後方互換性のため残す）
  images: string[]; // プロフィール画像（最大10枚）
  description: string;
  netReservation: boolean;
  specialDesignationFee: number | null;
  regularDesignationFee: number | null;
  panelDesignationRank: number;
  regularDesignationRank: number;
  workStatus: "出勤" | "未出勤";
  workStart?: Date;
  workEnd?: Date;
  appointments: Appointment[];
  availableOptions: string[]; // 可能オプションのIDリスト
  
  // 公開プロフィール情報
  publicProfile?: PublicProfile;
}

export interface PublicProfile {
  // スタイル
  bustCup: string; // E cup
  bodyType: string[]; // スレンダー、普通、グラマー等
  personality: string[]; // 正統派セラピスト、清楚なお姉さん等
  
  // 可能プレイ
  availableServices: string[];
  
  // 検索用
  smoking: "吸わない" | "吸う" | "電子タバコ";
  massageQualification: boolean;
  qualificationDetails: string[];
  homeVisit: "NG" | "OK";
  tattoo: "なし" | "ある";
  bloodType: "A" | "B" | "O" | "AB" | "秘密";
  birthplace: string;
  foreignerOk: "NG" | "OK";
  
  // 個人情報
  hobbies: string;
  charmPoint: string;
  personalityOneWord: string;
  favoriteType: string;
  favoriteFood: string;
  specialTechnique: string;
  shopMessage: string;
  customerMessage: string;
}

export interface Appointment { // Appointment型定義を追加
  id: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationTime: string;
  status: "provisional" | "confirmed";
  location?: string;
  price: number;
}


export interface CastSchedule {
  castId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  bookings?: number; // 予約数
}
