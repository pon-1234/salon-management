import { Message, Customer } from '../types/chat'

export const customers: Customer[] = [
  {
    id: '1',
    name: 'priv_hon.',
    lastMessage: 'お世話になります。承知しました。当日はよろしくお願い...',
    lastMessageTime: '0:02',
    hasUnread: true,
    unreadCount: 3,
    isOnline: true,
    avatar: '/placeholder-user.jpg',
    memberType: 'vip',
  },
  {
    id: '2',
    name: '折原省吾',
    lastMessage: '予約がキャンセルされました 12/13 16:00～ 110分',
    lastMessageTime: '12/9',
    hasUnread: false,
    unreadCount: 0,
    isOnline: false,
    avatar: '/placeholder-user.jpg',
    lastSeen: '2時間前',
    memberType: 'regular',
  },
  {
    id: '3',
    name: '石原',
    lastMessage: 'この度はご利用頂きありがとうございました。よろしければ口...',
    lastMessageTime: '12/9',
    hasUnread: true,
    unreadCount: 1,
    isOnline: false,
    avatar: '/placeholder-user.jpg',
    lastSeen: '5時間前',
    memberType: 'regular',
  },
  {
    id: '4',
    name: '山田花子',
    lastMessage: '今度もお世話になります。また連絡します。',
    lastMessageTime: '12/8',
    hasUnread: false,
    unreadCount: 0,
    isOnline: true,
    avatar: '/placeholder-user.jpg',
    memberType: 'vip',
  },
  {
    id: '5',
    name: '田中太郎',
    lastMessage: 'ありがとうございました。とても良かったです。',
    lastMessageTime: '12/7',
    hasUnread: true,
    unreadCount: 2,
    isOnline: false,
    avatar: '/placeholder-user.jpg',
    lastSeen: '1日前',
    memberType: 'regular',
  },
]

export const messages: Message[] = [
  {
    id: '1',
    sender: 'customer',
    content: 'よろしくお願いします。',
    timestamp: '14:40',
    customerId: '1', // customerIdを追加
  },
  {
    id: '2',
    sender: 'staff',
    content: `お世話になっております。

ご対応が遅くなり大変申し訳ございません。

16:40にてご予約内容を確定させていただきました。

<確認のお電話>
お手数ですが、ご予約当日の2時間前までに、お店まで確認のお電話をお願いいたします。

当日は、ご予約時間10分前までに、ホテル名・お部屋番号を下記お店までご連絡お願いいたします。
TEL:03-5931-5743
※ご予約内容の変更・キャンセルなども直接お電話にてご連絡お願いいたします。

<オススメホテルのご紹介>
当店は池袋駅東口・北口にございますので下記ホテル及び周辺ホテルですとスムーズなご対応が可能になります。
・トキウウエスト
・アトランスホテル
・ホテルトキワ
・ムーンパティオ
※池袋東口・南口→西口の場合、別途タクシー代を頂く場合がございますのでご了承ください。

せひ、素敵なお時間をお過ごしください。`,
    timestamp: '23:40',
    readStatus: '既読',
    isReservationInfo: true,
    customerId: '1', // customerIdを追加
  },
  {
    id: '3',
    sender: 'staff',
    content: 'お世話になります。\n承知しました。\n当日はよろしくお願いします。',
    timestamp: '00:02',
    customerId: '1', // customerIdを追加
  },
]
