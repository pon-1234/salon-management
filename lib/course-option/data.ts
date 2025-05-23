import { Course, Option } from '../types/course-option';

export const courses: Course[] = [
  { id: "60min", name: "60分", duration: 60, price: 13000 },
  { id: "80min", name: "80分", duration: 80, price: 16000 },
  { id: "100min", name: "100分", duration: 100, price: 19000 },
  { id: "120min", name: "120分", duration: 120, price: 22000 },
  { id: "150min", name: "150分", duration: 150, price: 26000 },
  { id: "180min", name: "180分", duration: 180, price: 30000 },
  { id: "event70", name: "イベント70分", duration: 70, price: 15000 },
  { id: "event90", name: "イベント90分", duration: 90, price: 18000 },
  { id: "event110", name: "イベント110分", duration: 110, price: 21000 },
  { id: "event130", name: "イベント130分", duration: 130, price: 24000 },
  { id: "event160", name: "イベント160分", duration: 160, price: 28000 },
  { id: "event190", name: "イベント190分", duration: 190, price: 32000 },
  { id: "extension30", name: "延長30分", duration: 30, price: 5000 },
];

export const options: Option[] = [
  { id: "healing-knee", name: "癒しの膝枕耳かき", price: 0 },
  { id: "shampoo-spa", name: "��着爽快洗髪スパ", price: 0 },
  { id: "oil-plus", name: "オイル増し増し", price: 0 },
  { id: "french-kiss", name: "キス（フレンチ）", price: 1000 },
  { id: "pantyhose", name: "パンスト", price: 1000 },
  { id: "kaiten-denma", name: "亀頭デンマ", price: 1000 },
  { id: "kaishun-plus", name: "回春増し増し", price: 2000, note: "※..." },
  { id: "zenritu-massage", name: "前立腺マッサージ", price: 2000 },
  { id: "all-nude", name: "オールヌード", price: 3000, note: "※..." },
  { id: "skin-fella", name: "スキン（ゴム）フェラ", price: 3000 },
];
