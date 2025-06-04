import { Cast, type CastSchedule, Appointment } from "./types"

const createDate = (hours: number, minutes = 0) => {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export type { Cast, Appointment }

export const castMembers: Cast[] = [
  {
    id: "1",
    name: "みるく",
    nameKana: "みるく",
    age: 20,
    height: 160,
    bust: "G",
    waist: 62,
    hip: 98,
    type: "カワイイ系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    images: [
      "https://rimane.net/images/tyrano-move-image01.jpg",
      "https://rimane.net/images/tyrano-move-image02.jpg",
      "https://rimane.net/images/tyrano-move-image03.jpg",
      "https://rimane.net/images/tyrano-move-image04.jpg"
    ],
    description:
      "明るく元気な性格で、お客様を楽しませることが得意です。マッサージの技術も高く、リピーターの多いキャストです。",
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: "出勤",
    workStart: createDate(10),
    workEnd: createDate(22),
    appointments: [],
    availableOptions: ["healing-knee", "shampoo-spa", "oil-plus", "french-kiss", "pantyhose", "kaishun-plus"],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    publicProfile: {
      bustCup: "G",
      bodyType: ["スレンダー", "普通"],
      personality: ["正統派セラピスト", "清楚なお姉さん"],
      availableServices: ["睾丸マッサージ", "オイルマッサージ", "全身マッサージ", "密着フェザータッチ"],
      smoking: "吸わない",
      massageQualification: true,
      qualificationDetails: ["メンズエステ経験者", "アロマリンパドレナージュ"],
      homeVisit: "NG",
      tattoo: "なし",
      bloodType: "A",
      birthplace: "関東地方",
      foreignerOk: "OK",
      hobbies: "料理",
      charmPoint: "目♡",
      personalityOneWord: "明るい",
      favoriteType: "紳士な人♡",
      favoriteFood: "ぷりん",
      specialTechnique: "超密着マッサージ",
      shopMessage: "とっても人懐っこく、とっても明るいキレ可愛いセラピストさん。穏やかな表情と優しそうな雰囲気ながら、プレイに入ると小悪魔系に責め立ててくれる、天性の素質を兼ね備えた女性です。",
      customerMessage: "初めまして♡ みるくと申します✨✨ 名前の通り愛をたくさんお届けできたらなぁと思ってます♪"
    }
  },
  {
    id: "2",
    name: "さくら",
    nameKana: "さくら",
    age: 23,
    height: 158,
    bust: "E",
    waist: 58,
    hip: 86,
    type: "清楚系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    images: [
      "https://rimane.net/images/tyrano-move-image01.jpg",
      "https://rimane.net/images/tyrano-move-image05.jpg",
      "https://rimane.net/images/tyrano-move-image06.jpg"
    ],
    description:
      "穏やかな性格で、丁寧な接客が好評です。リラックスマッサージが得意で、癒しを求めるお客様に人気があります。",
    netReservation: true,
    specialDesignationFee: 2000,
    regularDesignationFee: 1000,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: "出勤",
    workStart: createDate(12),
    workEnd: createDate(22),
    appointments: [],
    availableOptions: ["healing-knee", "shampoo-spa", "french-kiss", "zenritu-massage", "all-nude"],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: "3",
    name: "れい",
    nameKana: "れい",
    age: 25,
    height: 165,
    bust: "F",
    waist: 60,
    hip: 88,
    type: "モデル系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    images: [
      "https://rimane.net/images/tyrano-move-image01.jpg",
      "https://rimane.net/images/tyrano-move-image07.jpg",
      "https://rimane.net/images/tyrano-move-image08.jpg",
      "https://rimane.net/images/tyrano-move-image09.jpg",
      "https://rimane.net/images/tyrano-move-image10.jpg",
      "https://rimane.net/images/tyrano-move-image11.jpg"
    ],
    description:
      "モデル経験もあり、洗練された雰囲気が魅力です。ストレッチと組み合わせたマッサージが特徴で、体の柔軟性向上にも効果的です。",
    netReservation: true,
    specialDesignationFee: 3000,
    regularDesignationFee: 1500,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: "出勤",
    workStart: createDate(14),
    workEnd: createDate(24),
    appointments: [],
    availableOptions: ["oil-plus", "french-kiss", "pantyhose", "kaishun-plus", "zenritu-massage", "all-nude", "skin-fella"],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: "4",
    name: "ゆき",
    nameKana: "ゆき",
    age: 22,
    height: 155,
    bust: "D",
    waist: 56,
    hip: 84,
    type: "ロリ系",
    image: "https://rimane.net/images/tyrano-move-image01.jpg",
    images: [
      "https://rimane.net/images/tyrano-move-image01.jpg",
      "https://rimane.net/images/tyrano-move-image12.jpg"
    ],
    description:
      "小柄で可愛らしい外見と、意外な大人の魅力を併せ持つキャストです。細やかな気配りが得意で、初めてのお客様にも安心して利用いただけます。",
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: 1000,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: "出勤",
    workStart: createDate(11),
    workEnd: createDate(21),
    appointments: [],
    availableOptions: ["healing-knee", "shampoo-spa", "oil-plus", "pantyhose"],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
]

export function getAllCasts(): Cast[] {
  return castMembers
}

export const generateCastSchedule = (castId: string, startDate: Date, endDate: Date): CastSchedule[] => {
  const cast = castMembers.find((cast) => cast.id === castId)
  if (!cast) {
    return []
  }

  const schedule: CastSchedule[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const appointmentsForDay = cast.appointments.filter(
      (appointment) => appointment.startTime.toDateString() === currentDate.toDateString(),
    )

    // Use cast.workStart and cast.workEnd for startTime and endTime
    const startTime = new Date(currentDate)
    startTime.setHours(cast.workStart?.getHours() || 0, cast.workStart?.getMinutes() || 0, 0, 0)
    const endTime = new Date(currentDate)
    endTime.setHours(cast.workEnd?.getHours() || 0, cast.workEnd?.getMinutes() || 0, 0, 0)

    schedule.push({
      castId,
      date: new Date(currentDate),
      startTime,
      endTime,
      bookings: appointmentsForDay.length,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return schedule
}
