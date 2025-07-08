/**
 * @design_doc   Review API endpoints for CRUD operations
 * @related_to   ReviewRepository, Review type, Prisma Review model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const castId = searchParams.get('castId')
    const customerId = searchParams.get('customerId')

    if (id) {
      const review = await db.review.findUnique({
        where: { id },
        include: {
          customer: true,
          cast: true,
        },
      })

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      return NextResponse.json(review)
    }

    // Build filters for querying reviews
    const where: any = {}

    if (castId) where.castId = castId
    if (customerId) where.customerId = customerId

    const reviews = await db.review.findMany({
      where,
      include: {
        customer: true,
        cast: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching review data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const newReview = await db.review.create({
      data: {
        customerId: data.customerId,
        castId: data.castId,
        rating: data.rating,
        comment: data.comment || '',
      },
      include: {
        customer: true,
        cast: true,
      },
    })

    return NextResponse.json(newReview, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Error creating review')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatedReview = await db.review.update({
      where: { id },
      data: {
        rating: updates.rating,
        comment: updates.comment,
      },
      include: {
        customer: true,
        cast: true,
      },
    })

    return NextResponse.json(updatedReview)
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating review')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db.review.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting review')
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
