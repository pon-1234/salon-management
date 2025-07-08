/**
 * @design_doc   Reservation business logic service
 * @related_to   Reservation API, notification system, time slot management
 * @known_issues None currently
 */
import { PrismaClient } from '@/lib/generated/prisma'
import { NotificationService } from '@/lib/notification/service'
import { ReservationNotificationData } from '@/lib/notification/types'

const prisma = new PrismaClient()

export interface CreateReservationData {
  customerId: string
  staffId: string
  serviceId: string
  startTime: Date
  endTime: Date
  notes?: string
}

export interface ReservationValidationResult {
  isValid: boolean
  errors?: string[]
  conflicts?: any[]
}

export class ReservationService {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  async validateReservation(data: CreateReservationData): Promise<ReservationValidationResult> {
    const errors: string[] = []

    // Verify customer and staff exist
    const [customer, staff] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: data.customerId }
      }),
      prisma.cast.findUnique({
        where: { id: data.staffId }
      })
    ])

    if (!customer) {
      errors.push('Customer not found')
    }

    if (!staff) {
      errors.push('Staff not found')
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      }
    }

    // Check for time slot conflicts
    const conflicts = await this.detectReservationConflicts(
      data.staffId,
      data.startTime,
      data.endTime
    )

    if (conflicts.length > 0) {
      return {
        isValid: false,
        errors: ['Time slot conflict detected'],
        conflicts: conflicts.map(c => ({
          id: c.id,
          startTime: c.startTime,
          endTime: c.endTime
        }))
      }
    }

    return { isValid: true }
  }

  async createReservation(data: CreateReservationData) {
    // Validate reservation
    const validation = await this.validateReservation(data)
    if (!validation.isValid) {
      throw new Error(validation.errors?.join(', ') || 'Validation failed')
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        customerId: data.customerId,
        staffId: data.staffId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'confirmed',
        price: 0, // Will be calculated based on service
        notes: data.notes,
        modifiableUntil: new Date(data.startTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
      }
    })

    // Send confirmation notification
    await this.sendReservationConfirmation(reservation)

    return reservation
  }

  private async sendReservationConfirmation(reservation: any) {
    try {
      // Get customer and staff details for notification
      const [customer, staff] = await Promise.all([
        prisma.customer.findUnique({
          where: { id: reservation.customerId }
        }),
        prisma.cast.findUnique({
          where: { id: reservation.staffId }
        })
      ])

      if (!customer || !staff) {
        console.error('Customer or staff not found for notification')
        return
      }

      const notificationData: ReservationNotificationData = {
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        staffName: staff.name,
        serviceName: 'Service', // TODO: Get actual service name
        reservationDate: reservation.startTime,
        reservationTime: `${reservation.startTime.toLocaleTimeString()}-${reservation.endTime.toLocaleTimeString()}`,
        location: 'Salon Location', // TODO: Get actual location
        totalPrice: reservation.price,
        reservationId: reservation.id,
      }

      await this.notificationService.sendReservationConfirmation(notificationData)
    } catch (error) {
      console.error('Failed to send reservation confirmation:', error)
      // Don't throw - notification failure shouldn't prevent reservation creation
    }
  }

  private buildTimeOverlapFilter(startTime: Date, endTime: Date) {
    return {
      OR: [
        // Overlapping time slots
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    }
  }

  private async detectReservationConflicts(
    staffId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      const conflicts = await prisma.reservation.findMany({
        where: {
          staffId,
          status: {
            in: ['confirmed', 'pending']
          },
          ...this.buildTimeOverlapFilter(startTime, endTime)
        }
      })

      return conflicts
    } catch (error) {
      console.error('Error detecting conflicts:', error)
      return []
    }
  }
}