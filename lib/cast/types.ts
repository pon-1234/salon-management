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

// 売上・入金管理用の型定義
export interface SalesRecord {
  id: string;
  castId: string;
  date: Date;
  serviceName: string;
  customerName: string;
  serviceAmount: number; // サービス料金
  designationFee: number; // 指名料
  optionFees: number; // オプション料金
  totalAmount: number; // 合計金額
  castShare: number; // キャスト取り分
  shopShare: number; // 店舗取り分
  paymentStatus: "未精算" | "精算済み";
  location: string; // 施術場所
  notes?: string; // 備考
}

export interface PaymentRecord {
  id: string;
  castId: string;
  date: Date;
  paymentType: "現金精算" | "振込" | "その他";
  amount: number;
  salesRecordIds: string[]; // 対象の売上記録ID
  notes?: string;
  handledBy: string; // 処理者
}

export interface SettlementSummary {
  castId: string;
  period: {
    from: Date;
    to: Date;
  };
  totalSales: number; // 総売上
  totalCastShare: number; // キャスト取り分総額
  totalPaid: number; // 支払済み総額
  pendingAmount: number; // 未精算額
  recordCount: number; // 売上件数
}
