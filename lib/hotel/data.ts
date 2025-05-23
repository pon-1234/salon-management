import { Hotel } from '../types/hotel';

export const hotels: Hotel[] = [
  {
    id: '1',
    name: '池袋グランドホテル',
    category: 'グランドホテル',
    address: '〒171-0014 東京都豊島区池袋2丁目6 2-2',
    phone: '0359561011',
    area: '池袋',
    displayOrder: 1,
    isRecommended: true,
  },
  {
    id: '2',
    name: 'アトランスホテル',
    category: 'ビジネスホテル',
    address: '〒171-0022 東京都豊島区南池袋1-12-3',
    phone: '0359562022',
    area: '池袋',
    displayOrder: 2,
    isRecommended: true,
  },
  {
    id: '3',
    name: 'ホテルトキワ',
    category: 'シティホテル',
    address: '〒171-0021 東京都豊島区西池袋3-6-1',
    phone: '0359563033',
    area: '池袋',
    displayOrder: 3,
    isRecommended: true,
  },
];
