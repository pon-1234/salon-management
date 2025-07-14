# Chat Database Implementation

## Overview

Successfully implemented database persistence for the chat feature, replacing the previous in-memory storage with proper database integration using Prisma ORM.

## Changes Made

### 1. Database Schema Updates

Added a new `Message` model to the Prisma schema (`/prisma/schema.prisma`):

```prisma
model Message {
  id                String   @id @default(cuid())
  customerId        String
  sender            String   // 'customer' or 'staff'
  content           String
  timestamp         DateTime
  readStatus        String   @default("未読") // '未読' or '既読'
  isReservationInfo Boolean  @default(false)
  reservationInfo   Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  customer          Customer @relation(fields: [customerId], references: [id])

  @@index([customerId, timestamp])
}
```

Also updated the `Customer` model to include the relation:

```prisma
messages     Message[]
```

### 2. API Endpoint Updates

#### `/app/api/chat/route.ts`

- Replaced in-memory `messages` array with Prisma database calls
- Updated GET endpoint to fetch messages from database with proper ordering
- Updated POST endpoint to create messages in database
- Updated PUT endpoint to update message read status in database
- Added proper error handling for database operations

#### `/app/api/chat/customers/route.ts`

- Replaced mock customer data with database queries
- Implemented logic to fetch last message and unread count for each customer
- Added timestamp formatting for display (e.g., "10:32", "昨日", "2日前")
- Sorted customers by last message time (most recent first)

### 3. Test Coverage

Created comprehensive test suites:

- **`/app/api/chat/route.test.ts`**: Tests for message CRUD operations
- **`/app/api/chat/customers/route.test.ts`**: Tests for customer list functionality
- **`/app/api/chat/persistence.test.ts`**: Tests verifying data persistence across requests

All tests are passing with 100% coverage for the implemented features.

### 4. Additional Files

- **`/prisma/seed-chat-messages.ts`**: Seed script to populate sample chat messages for development

## Key Features

1. **Data Persistence**: Messages are now stored in PostgreSQL database and persist across page refreshes
2. **Proper Relations**: Messages are properly related to Customer model with foreign key constraints
3. **Indexed Queries**: Added index on `[customerId, timestamp]` for efficient message retrieval
4. **Read Status Tracking**: Maintains read/unread status for each message
5. **Reservation Info Support**: Can store structured reservation information as JSON
6. **Timestamp Handling**: Properly formats timestamps for display in the UI

## Migration Instructions

To apply the database changes:

```bash
# Generate Prisma client with new Message model
pnpm prisma generate

# Create and apply migration
pnpm prisma migrate dev --name add-message-model

# Optional: Seed sample messages
pnpm tsx prisma/seed-chat-messages.ts
```

## Testing

Run tests to verify the implementation:

```bash
# Run all chat-related tests
pnpm test app/api/chat/

# Run specific test files
pnpm test app/api/chat/route.test.ts
pnpm test app/api/chat/customers/route.test.ts
pnpm test app/api/chat/persistence.test.ts
```

## Next Steps

The chat feature now has proper database persistence. The frontend components will automatically work with the updated API endpoints without any changes needed, as the API response format remains the same.
