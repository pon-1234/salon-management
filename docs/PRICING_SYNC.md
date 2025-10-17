# Pricing Synchronization System

## Overview

The pricing synchronization system ensures that pricing information is consistent between the admin panel and the customer-facing frontend across all stores.

## Architecture

### Data Models

1. **CoursePrice** - Course pricing with multiple duration options
   - Name, description, features
   - Multiple duration/price combinations
   - Category (standard/premium/vip)
   - Display order and active status

2. **OptionPrice** - Add-on service options
   - Name, description, price
   - Optional duration
   - Category (relaxation/body-care/extension/special)
   - Display order and active status

3. **AdditionalFee** - Extra charges
   - Type: fixed/percentage/range
   - Value (amount or percentage)
   - Description and display order

4. **StorePricing** - Store-specific pricing configuration
   - Links pricing to specific stores
   - Includes notes and last update timestamp

### Repository Pattern

The system uses a repository pattern with:

- `PricingRepository` interface for data access
- `PricingRepositoryImpl` with in-memory storage (can be replaced with API calls)
- `PricingUseCases` for business logic

### Synchronization Flow

1. Admin edits pricing in admin panel
2. Changes are saved to the repository
3. Sync status is updated (marked as unsynced)
4. Admin can trigger sync to push changes to all stores
5. Frontend pages read from the same repository

## Admin Panel Pages

### Course Info (`/admin/settings/course-info`)

- Manage course pricing with multiple durations
- Set features and target audience
- Enable/disable courses
- Mark courses as popular

### Option Info (`/admin/settings/option-info`)

- Manage add-on options
- Set prices and categories
- Optional duration for time-based options

### Designation Fees (`/admin/settings/designation-fees`)

- Manage nomination fees such as free designation, panel designation, repeat designation
- Configure total fee along with store and cast share
- Currently backed by mock data in the admin UI

## Frontend Integration

### Pricing Page (`/[store]/pricing`)

- Reads pricing from centralized system
- Displays courses grouped by category
- Shows options organized by type
- Lists additional fees with proper formatting

## Usage Examples

### Adding a New Course

```typescript
const pricingUseCases = getPricingUseCases()
const newCourse = await pricingUseCases.createCourse({
  name: 'スペシャルコース',
  description: '特別なサービス',
  durations: [
    { time: 90, price: 30000 },
    { time: 120, price: 40000 },
  ],
  features: ['特別マッサージ', 'VIPルーム'],
  category: 'premium',
  displayOrder: 4,
  isActive: true,
  isPopular: true,
})
```

### Calculating Total Price

```typescript
const total = await pricingUseCases.calculateTotalPrice(
  courseId, // Selected course
  90, // Duration in minutes
  ['opt1', 'opt2'], // Selected options
  true // Is late night
)
```

### Syncing Prices

```typescript
await pricingUseCases.syncPricing(storeId)
```

## Migration from Old System

The system includes a migration method to convert from the old format:

```typescript
await pricingUseCases.migrateFromOldFormat(oldCourses, oldOptions, storeId)
```

## Future Enhancements

1. **API Integration**: Replace in-memory storage with API calls
2. **Multi-store Pricing**: Different prices per store
3. **Price History**: Track price changes over time
4. **Bulk Operations**: Update multiple items at once
5. **Import/Export**: CSV or Excel support
6. **Validation Rules**: Business rules for pricing
7. **Approval Workflow**: Require approval for price changes
