/**
 * @design_doc   Integration tests for multi-API scenarios
 * @related_to   All API endpoints, workflow testing
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as CustomerPOST } from './customer/route'
import { POST as ReservationPOST, GET as ReservationGET } from './reservation/route'
import { POST as ReviewPOST, GET as ReviewGET } from './review/route'
import { GET as CoursePriceGET } from './course/route'
import { GET as OptionPriceGET } from './option/route'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcrypt'

// Mock all dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    coursePrice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    optionPrice: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('./reservation/availability/route', () => ({
  checkCastAvailability: vi.fn(),
}))

vi.mock('date-fns-tz', () => ({
  fromZonedTime: vi.fn((date) => new Date(date)),
}))

vi.mock('@/lib/notification/service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendReservationConfirmation: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}))

import { checkCastAvailability } from './reservation/availability/route'

describe('Customer Journey Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete a full customer journey: registration -> reservation -> review', async () => {
    // Set up authentication for reservation and review APIs
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'customer-integration-1',
        role: 'customer',
        email: 'integration@test.com',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    
    // Step 1: Customer Registration
    const customerData = {
      name: 'Integration Test Customer',
      nameKana: 'インテグレーションテストカスタマー',
      phone: '09012345678',
      email: 'integration@test.com',
      password: 'password123',
      birthDate: '1990-01-01',
    }

    const mockCustomer = {
      id: 'customer-integration-1',
      ...customerData,
      password: 'hashed-password',
      birthDate: new Date('1990-01-01'),
      ngCasts: [],
      reservations: [],
      reviews: [],
    }

    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed-password' as any)
    vi.mocked(db.customer.create).mockResolvedValueOnce(mockCustomer as any)

    const customerRequest = new NextRequest('http://localhost:3000/api/customer', {
      method: 'POST',
      body: JSON.stringify(customerData),
    })

    const customerResponse = await CustomerPOST(customerRequest)
    const customerResult = await customerResponse.json()

    expect(customerResponse.status).toBe(201)
    expect(customerResult.id).toBe('customer-integration-1')

    // Step 2: Make a Reservation
    const reservationData = {
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-15T10:00:00+09:00',
      endTime: '2025-07-15T11:00:00+09:00',
      options: ['option1'],
    }

    const mockReservation = {
      id: 'reservation-integration-1',
      customerId: 'customer-integration-1',
      ...reservationData,
      startTime: new Date('2025-07-15T01:00:00Z'),
      endTime: new Date('2025-07-15T02:00:00Z'),
      status: 'confirmed',
      customer: mockCustomer,
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course', price: 10000 },
      options: [{ option: { id: 'option1', name: 'Extra Service', price: 2000 } }],
    }

    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      const txDb = {
        reservation: {
          create: vi.fn().mockResolvedValue(mockReservation),
        },
      }
      return await fn(txDb)
    })

    const reservationRequest = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer-integration-1',
      },
      body: JSON.stringify(reservationData),
    })

    const reservationResponse = await ReservationPOST(reservationRequest)
    const reservationResult = await reservationResponse.json()

    expect(reservationResponse.status).toBe(201)
    expect(reservationResult.id).toBe('reservation-integration-1')
    expect(reservationResult.customerId).toBe('customer-integration-1')

    // Step 3: Leave a Review
    const reviewData = {
      customerId: 'customer-integration-1',
      castId: 'cast1',
      rating: 5,
      comment: 'Excellent service from the integration test!',
    }

    const mockReview = {
      id: 'review-integration-1',
      ...reviewData,
      createdAt: new Date('2025-07-15T12:00:00Z'),
      customer: mockCustomer,
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.review.create).mockResolvedValueOnce(mockReview as any)

    const reviewRequest = new NextRequest('http://localhost:3000/api/review', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    })

    const reviewResponse = await ReviewPOST(reviewRequest)
    const reviewResult = await reviewResponse.json()

    expect(reviewResponse.status).toBe(201)
    expect(reviewResult.id).toBe('review-integration-1')
    expect(reviewResult.rating).toBe(5)

    // Step 4: Verify the complete customer journey
    expect(customerResult.email).toBe('integration@test.com')
    expect(reservationResult.cast.name).toBe('Test Cast')
    expect(reviewResult.customer.name).toBe('Integration Test Customer')
  })

  it('should handle pricing calculation across course and options', async () => {
    // Get course pricing
    const mockCourses = [
      {
        id: 'course1',
        name: '60-minute Course',
        duration: 60,
        price: 10000,
        description: 'Standard 60-minute session',
        reservations: [],
      },
      {
        id: 'course2',
        name: '90-minute Course',
        duration: 90,
        price: 15000,
        description: 'Extended 90-minute session',
        reservations: [],
      },
    ]

    vi.mocked(db.coursePrice.findMany).mockResolvedValueOnce(mockCourses as any)

    const courseRequest = new NextRequest('http://localhost:3000/api/course', {
      method: 'GET',
    })

    const courseResponse = await CoursePriceGET(courseRequest)
    const courses = await courseResponse.json()

    // Get option pricing
    const mockOptions = [
      {
        id: 'option1',
        name: 'Extended Service',
        price: 2000,
        reservations: [],
      },
      {
        id: 'option2',
        name: 'Premium Add-on',
        price: 3000,
        reservations: [],
      },
    ]

    vi.mocked(db.optionPrice.findMany).mockResolvedValueOnce(mockOptions as any)

    const optionRequest = new NextRequest('http://localhost:3000/api/option', {
      method: 'GET',
    })

    const optionResponse = await OptionPriceGET(optionRequest)
    const options = await optionResponse.json()

    // Calculate total price for a reservation
    const selectedCourse = courses.find((c: any) => c.id === 'course1')
    const selectedOptions = options.filter((o: any) => ['option1', 'option2'].includes(o.id))

    const totalPrice =
      selectedCourse.price + selectedOptions.reduce((sum: number, opt: any) => sum + opt.price, 0)

    expect(courseResponse.status).toBe(200)
    expect(optionResponse.status).toBe(200)
    expect(totalPrice).toBe(15000) // 10000 + 2000 + 3000
    expect(selectedCourse.name).toBe('60-minute Course')
    expect(selectedOptions).toHaveLength(2)
  })

  it('should handle reservation conflicts and availability checking', async () => {
    // Set up authentication
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'customer1',
        role: 'customer',
        email: 'customer@example.com',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })
    
    // Test scenario: Try to book conflicting time slots
    const conflictingReservationData = {
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-15T10:00:00+09:00',
      endTime: '2025-07-15T11:00:00+09:00',
    }

    // Mock availability check returning conflicts
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false,
      conflicts: [
        {
          id: 'existing-reservation',
          startTime: '2025-07-15T10:30:00Z',
          endTime: '2025-07-15T11:30:00Z',
        },
      ],
    })

    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      const txDb = {
        reservation: {
          create: vi.fn(),
        },
      }
      try {
        await fn(txDb)
      } catch (error: any) {
        if (error.message === 'Time slot is not available') {
          throw error
        }
      }
    })

    const conflictingRequest = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(conflictingReservationData),
    })

    const conflictResponse = await ReservationPOST(conflictingRequest)
    const conflictResult = await conflictResponse.json()

    expect(conflictResponse.status).toBe(409)
    expect(conflictResult.error).toBe('Time slot is not available')
  })

  it('should aggregate customer data across multiple APIs', async () => {
    const customerId = 'customer-aggregate-test'
    
    // Set up authentication
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: customerId,
        role: 'customer',
        email: 'aggregate@test.com',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    // Mock customer reservations
    const mockReservations = [
      {
        id: 'res1',
        customerId,
        castId: 'cast1',
        startTime: new Date('2025-07-15T10:00:00Z'),
        endTime: new Date('2025-07-15T11:00:00Z'),
        status: 'confirmed',
        customer: { id: customerId, name: 'Test Customer' },
        cast: { id: 'cast1', name: 'Cast 1' },
        course: { id: 'course1', name: '60-minute Course' },
        options: [],
      },
      {
        id: 'res2',
        customerId,
        castId: 'cast2',
        startTime: new Date('2025-07-16T10:00:00Z'),
        endTime: new Date('2025-07-16T11:00:00Z'),
        status: 'confirmed',
        customer: { id: customerId, name: 'Test Customer' },
        cast: { id: 'cast2', name: 'Cast 2' },
        course: { id: 'course1', name: '60-minute Course' },
        options: [],
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValueOnce(mockReservations as any)

    // Mock customer reviews
    const mockReviews = [
      {
        id: 'review1',
        customerId,
        castId: 'cast1',
        rating: 5,
        comment: 'Great service!',
        createdAt: new Date('2025-07-15T12:00:00Z'),
        customer: { id: customerId, name: 'Test Customer' },
        cast: { id: 'cast1', name: 'Cast 1' },
      },
    ]

    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockReviews as any)

    // Get customer reservations
    const reservationRequest = new NextRequest(
      `http://localhost:3000/api/reservation?customerId=${customerId}`,
      {
        method: 'GET',
        headers: {
          'x-customer-id': customerId,
        },
      }
    )

    const reservationResponse = await ReservationGET(reservationRequest)
    const reservations = await reservationResponse.json()

    // Get customer reviews
    const reviewRequest = new NextRequest(
      `http://localhost:3000/api/review?customerId=${customerId}`,
      {
        method: 'GET',
      }
    )

    const reviewResponse = await ReviewGET(reviewRequest)
    const reviews = await reviewResponse.json()

    // Verify aggregated data
    expect(reservationResponse.status).toBe(200)
    expect(reviewResponse.status).toBe(200)
    expect(reservations).toHaveLength(2)
    expect(reviews).toHaveLength(1)

    // Calculate customer statistics
    const totalReservations = reservations.length
    const averageRating =
      reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    const uniqueCasts = new Set(reservations.map((r: any) => r.castId)).size

    expect(totalReservations).toBe(2)
    expect(averageRating).toBe(5)
    expect(uniqueCasts).toBe(2)
  })
})

describe('Cast Performance Analytics Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate cast performance metrics across reservations and reviews', async () => {
    const castId = 'cast-analytics-test'
    
    // Set up authentication for admin analytics
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'admin1',
        role: 'admin',
        email: 'admin@test.com',
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    // Mock cast reservations
    const mockCastReservations = [
      {
        id: 'res1',
        customerId: 'customer1',
        castId,
        status: 'confirmed',
        customer: { id: 'customer1', name: 'Customer 1' },
        cast: { id: castId, name: 'Test Cast' },
      },
      {
        id: 'res2',
        customerId: 'customer2',
        castId,
        status: 'confirmed',
        customer: { id: 'customer2', name: 'Customer 2' },
        cast: { id: castId, name: 'Test Cast' },
      },
      {
        id: 'res3',
        customerId: 'customer3',
        castId,
        status: 'cancelled',
        customer: { id: 'customer3', name: 'Customer 3' },
        cast: { id: castId, name: 'Test Cast' },
      },
    ]

    // Mock cast reviews
    const mockCastReviews = [
      {
        id: 'review1',
        customerId: 'customer1',
        castId,
        rating: 5,
        comment: 'Excellent!',
        customer: { id: 'customer1', name: 'Customer 1' },
        cast: { id: castId, name: 'Test Cast' },
      },
      {
        id: 'review2',
        customerId: 'customer2',
        castId,
        rating: 4,
        comment: 'Very good',
        customer: { id: 'customer2', name: 'Customer 2' },
        cast: { id: castId, name: 'Test Cast' },
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValueOnce(mockCastReservations as any)
    vi.mocked(db.review.findMany).mockResolvedValueOnce(mockCastReviews as any)

    // Get cast reservations
    const reservationRequest = new NextRequest(
      `http://localhost:3000/api/reservation?castId=${castId}`,
      {
        method: 'GET',
        headers: {
          'x-customer-id': 'admin', // Assuming admin can see all reservations
        },
      }
    )

    const reservationResponse = await ReservationGET(reservationRequest)
    const reservations = await reservationResponse.json()

    // Get cast reviews
    const reviewRequest = new NextRequest(`http://localhost:3000/api/review?castId=${castId}`, {
      method: 'GET',
    })

    const reviewResponse = await ReviewGET(reviewRequest)
    const reviews = await reviewResponse.json()

    // Calculate performance metrics
    const reservationArray = Array.isArray(reservations) ? reservations : []
    const totalReservations = reservationArray.length
    const confirmedReservations = reservationArray.filter((r: any) => r.status === 'confirmed').length
    const cancellationRate = ((totalReservations - confirmedReservations) / totalReservations) * 100
    const averageRating =
      reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    const reviewCount = reviews.length

    expect(reservationResponse.status).toBe(200)
    expect(reviewResponse.status).toBe(200)
    expect(totalReservations).toBe(3)
    expect(confirmedReservations).toBe(2)
    expect(cancellationRate).toBe(33.33333333333333)
    expect(averageRating).toBe(4.5)
    expect(reviewCount).toBe(2)
  })
})
