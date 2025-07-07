/**
 * @design_doc   Not available
 * @related_to   CastRepository, Cast type
 * @known_issues Not available
 */
import { NextRequest, NextResponse } from 'next/server'
import { Cast } from '@/lib/cast/types'

// In-memory storage for now
const castMembers: Map<string, Cast> = new Map()

// Seed with test data
castMembers.set('test-id', {
  id: 'test-id',
  name: 'Test Cast',
  nameKana: 'テストキャスト',
  age: 25,
  height: 165,
  bust: 'B',
  waist: 58,
  hip: 85,
  type: 'カワイイ系',
  image: 'https://example.com/image.jpg',
  images: ['https://example.com/image.jpg'],
  description: 'Test description',
  netReservation: true,
  workStatus: '出勤',
  workStart: new Date(2023, 0, 1, 10, 0),
  workEnd: new Date(2023, 0, 1, 22, 0),
  specialDesignationFee: 2000,
  regularDesignationFee: 1000,
  availableOptions: ['option1'],
  panelDesignationRank: 1,
  regularDesignationRank: 1,
  appointments: [],
  publicProfile: {
    bustCup: 'B cup',
    bodyType: ['スレンダー'],
    personality: ['friendly'],
    availableServices: ['standard'],
    smoking: '吸わない',
    massageQualification: false,
    qualificationDetails: [],
    homeVisit: 'NG',
    tattoo: 'なし',
    bloodType: 'A',
    birthplace: 'Tokyo',
    foreignerOk: 'OK',
    hobbies: 'Reading',
    charmPoint: 'Smile',
    personalityOneWord: 'Friendly',
    favoriteType: 'Gentleman',
    favoriteFood: 'Sushi',
    specialTechnique: 'Massage',
    shopMessage: 'Welcome',
    customerMessage: 'Nice to meet you',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (id) {
    const cast = castMembers.get(id)
    if (!cast) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }
    return NextResponse.json(cast)
  }

  return NextResponse.json(Array.from(castMembers.values()))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const id = `cast-${Date.now()}`
  const now = new Date()

  const newCast: Cast = {
    id,
    name: body.name || '',
    nameKana: body.nameKana || '',
    age: body.age || 20,
    height: body.height || 160,
    bust: body.bust || 'B',
    waist: body.waist || 60,
    hip: body.hip || 85,
    type: body.type || 'カワイイ系',
    image: body.image || '',
    images: body.images || [],
    description: body.description || '',
    netReservation: body.netReservation ?? true,
    specialDesignationFee: body.specialDesignationFee || null,
    regularDesignationFee: body.regularDesignationFee || null,
    workStatus: body.workStatus || '出勤',
    workStart: body.workStart || null,
    workEnd: body.workEnd || null,
    appointments: body.appointments || [],
    availableOptions: body.availableOptions || [],
    panelDesignationRank: body.panelDesignationRank || 1,
    regularDesignationRank: body.regularDesignationRank || 1,
    publicProfile: body.publicProfile,
    createdAt: now,
    updatedAt: now,
  }

  castMembers.set(id, newCast)
  return NextResponse.json(newCast, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const existingCast = castMembers.get(id)
  if (!existingCast) {
    return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
  }

  const updatedCast: Cast = {
    ...existingCast,
    ...updates,
    id,
    createdAt: existingCast.createdAt,
    updatedAt: new Date(),
  }

  castMembers.set(id, updatedCast)
  return NextResponse.json(updatedCast)
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  if (!castMembers.has(id)) {
    return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
  }

  castMembers.delete(id)
  return new NextResponse(null, { status: 204 })
}
