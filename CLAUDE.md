# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tempus is a personal time tracking system for clock in/out management with both web and Discord bot interfaces. The core architectural principle is **order-based type calculation**: records don't store clock in/out type in the database. Instead, the type is calculated from the record's position in the sorted daily records (odd position = clock in, even = clock out).

## Development Commands

### Database Management
```bash
# Start PostgreSQL container (Docker)
npm run db:start

# Stop PostgreSQL container
npm run db:stop

# Run migrations
npm run db:migrate

# Reset database (deletes all data)
npm run db:reset

# Open Prisma Studio (GUI)
npm run db:studio
```

### Development
```bash
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run format
```

## Critical Architecture Concepts

### 1. Custom Day Boundary (6AM-6AM)
The system defines one "day" as 6:00 AM to 5:59:59 AM the next calendar day. This is not midnight-to-midnight.

**Key utilities in `src/lib/utils.ts`:**
- `getDayStart(date)` - Returns 6:00 AM of the "day" containing the date
- `getDayEnd(date)` - Returns 5:59:59.999 AM of the next calendar day
- `getMonthStart(year, month)` - Returns month start (1st at 6:00 AM)
- `getMonthEnd(year, month)` - Returns month end (next month 1st at 5:59:59.999 AM)

**Always use these functions** when querying records by date. Never use midnight-based date calculations.

### 2. Order-Based Type Calculation
The database does NOT store a `type` field. Clock in/out is determined by record order within each day:
- Odd position (1st, 3rd, 5th...) = clock in
- Even position (2nd, 4th, 6th...) = clock out

**Key function:** `addTypeToRecords(records)` in `src/lib/utils.ts`

This function must be called after:
- Creating a new record
- Updating a record's timestamp
- Deleting a record
- Querying records for display

**Why this design?** It prevents data inconsistency when records are added/deleted out of order. The type is always correct based on the current state of all records.

### 3. Monthly Statistics Calculation
Located in `calculateMonthlyStats(records)` in `src/lib/utils.ts`:
- Groups records by day (using 6AM-6AM boundaries)
- Calculates type for each record via order
- Pairs clock in/out records
- If a day has an odd number of records → missing clock out (shows alert, excluded from total)
- Returns: total working hours (HH:MM format), working days, missing clock out dates

### 4. Database Schema (PostgreSQL)
```prisma
model Record {
  id        Int      @id @default(autoincrement())
  timestamp DateTime
  source    String   // 'web' or 'discord'
  isEdited  Boolean  @default(false)
  comment   String?  // For manual edits
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([timestamp])
}
```

**No `type` field exists.** Type is calculated at runtime.

### 5. API Flow Pattern
When creating or updating records:

1. Write to database
2. Query all records for that day (6AM-6AM range)
3. Sort by timestamp ascending
4. Call `addTypeToRecords()` to calculate types
5. Return the specific record with its calculated type

Example from `POST /api/clock`:
```typescript
const dayStart = getDayStart(now);
const dayEnd = getDayEnd(now);

const dayRecords = await prisma.record.findMany({
  where: {
    timestamp: { gte: dayStart, lte: dayEnd }
  },
  orderBy: { timestamp: 'asc' }
});

const recordsWithType = addTypeToRecords(dayRecords);
const newRecordWithType = recordsWithType.find(r => r.id === newRecord.id);
```

### 6. Build and Deployment
**Local:** Uses Docker PostgreSQL (see `docker-compose.yml`)

**Production (Vercel):**
- `build.sh` script runs `prisma migrate deploy` before `next build`
- This ensures migrations run automatically on every deployment
- Never manually run migrations in production

## Code Architecture

### Backend Structure
```
src/
├── app/api/
│   ├── clock/route.ts          # POST: Create clock record
│   ├── status/route.ts         # GET: Current clock status (in/out)
│   ├── records/route.ts        # GET: Monthly records with stats
│   └── records/[id]/route.ts   # PUT/DELETE: Edit/delete record
├── lib/
│   ├── utils.ts                # Date/time utilities, type calculation
│   └── prisma.ts               # Prisma client singleton
└── middleware.ts               # Basic auth protection
```

### Frontend Structure
```
src/
├── app/
│   ├── page.tsx                # Main page
│   └── layout.tsx              # Root layout
└── components/
    ├── ClockButton.tsx         # Main clock in/out button
    ├── StatusDisplay.tsx       # Shows current status
    ├── RecordsList.tsx         # Monthly record list with stats
    ├── RecordItem.tsx          # Individual record row
    ├── EditModal.tsx           # Edit/add record modal
    └── AlertBanner.tsx         # Missing clock out warning
```

## Common Patterns

### Querying Records for a Specific Day
```typescript
const dayStart = getDayStart(targetDate);
const dayEnd = getDayEnd(targetDate);

const records = await prisma.record.findMany({
  where: {
    timestamp: { gte: dayStart, lte: dayEnd }
  },
  orderBy: { timestamp: 'asc' }
});

const recordsWithType = addTypeToRecords(records);
```

### Querying Records for a Month
```typescript
const monthStart = getMonthStart(year, month);
const monthEnd = getMonthEnd(year, month);

const records = await prisma.record.findMany({
  where: {
    timestamp: { gte: monthStart, lte: monthEnd }
  },
  orderBy: { timestamp: 'asc' }
});

const stats = calculateMonthlyStats(records);
```

### After Edit/Delete Operations
Always recalculate types for the affected day:
```typescript
// After update/delete
const dayRecords = await prisma.record.findMany({
  where: {
    timestamp: { gte: dayStart, lte: dayEnd }
  },
  orderBy: { timestamp: 'asc' }
});

const recordsWithType = addTypeToRecords(dayRecords);
```

## Environment Variables

Required for development:
```env
DATABASE_URL=postgresql://tempus:tempus_dev_password@localhost:5432/tempus
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=changeme
```

Optional (Discord integration, not yet implemented):
```env
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_USER_ID=your-discord-user-id
DISCORD_NOTIFICATION_CHANNEL_ID=your-channel-id
```

## Important Constraints

1. **Never add a `type` field to the database schema** - This would break the order-based calculation system
2. **Always use 6AM-6AM day boundaries** - Never use midnight-based date logic
3. **Always sort records by timestamp ascending** before calling `addTypeToRecords()`
4. **Edited records** - Set `isEdited: true` when manually modifying timestamp or adding past records
5. **Next.js 15 async params** - Dynamic route params are now Promises: `const { id } = await params`

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Docker locally, Vercel Postgres in production)
- **ORM**: Prisma
- **Linter/Formatter**: Biome
- **Authentication**: Basic Auth via middleware

## Testing Locally

```bash
# Start PostgreSQL
npm run db:start

# Start dev server
npm run dev

# Test clock in
curl -X POST -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{"source":"web"}' \
  http://localhost:3000/api/clock

# Check status
curl -u admin:changeme http://localhost:3000/api/status
```
