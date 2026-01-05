# Admin Invoice Filtering & Excel Export Implementation

## Date: 2025-01-XX

## Overview

Implemented comprehensive admin dashboard functionality for filtering supplier vs buyer invoices and exporting selected invoices to Excel based on date + time range.

## Problem Solved

Previously, the invoice entity had both `supplierName` and `billToName`, making it unclear whether an invoice was from a supplier's perspective or a buyer's perspective. Text parsing/guessing for filtering was unreliable.

## Solution

### 1. Added Invoice Type Field

**File**: `src/common/enums/invoice-type.enum.ts`
- Created `InvoiceType` enum with two values:
  - `SUPPLIER_INVOICE`: Invoice created by supplier (supplier is the seller)
  - `BUYER_INVOICE`: Invoice created by buyer (buyer is the seller)

**File**: `src/entities/invoice.entity.ts`
- Added `invoiceType` field of type `InvoiceType` enum
- Default value: `SUPPLIER_INVOICE`
- Field is NOT NULL to ensure all invoices have a clear type

**Migration**: `src/migrations/1767592254027-add-invoice-type.ts`
- Creates PostgreSQL enum type `invoice_type_enum`
- Adds `invoiceType` column to `invoices` table with default value
- Includes rollback functionality

### 2. Updated Invoice DTOs

**File**: `src/modules/invoices/dto/create-invoice.dto.ts`
- Added optional `invoiceType` field
- Defaults to `SUPPLIER_INVOICE` if not provided

**File**: `src/modules/invoices/dto/update-invoice.dto.ts`
- Automatically includes `invoiceType` (via `PartialType`)

**New File**: `src/modules/invoices/dto/filter-invoices.dto.ts`
- DTO for admin filtering with optional fields:
  - `invoiceType`: Filter by SUPPLIER_INVOICE or BUYER_INVOICE
  - `startDate`: Start date/time for filtering
  - `endDate`: End date/time for filtering
  - `supplierName`: Partial match on supplier name
  - `buyerName`: Partial match on buyer name (billToName)
  - `userId`: Filter by specific user ID

**New File**: `src/modules/invoices/dto/export-invoices.dto.ts`
- DTO for Excel export with:
  - `invoiceType`: Optional filter by invoice type
  - `startDate`: Start date/time (required if invoiceIds not provided)
  - `endDate`: End date/time (required if invoiceIds not provided)
  - `invoiceIds`: Optional array of specific invoice IDs (if provided, date range is ignored)

### 3. Enhanced Invoice Service

**File**: `src/modules/invoices/invoices.service.ts`

**New Method**: `filterInvoices(filterDto: FilterInvoicesDto)`
- Filters invoices using TypeORM QueryBuilder
- Supports all filter criteria from FilterInvoicesDto
- Returns invoices with relations (truck, user)
- Ordered by createdAt DESC

**New Method**: `exportInvoicesToExcel(exportDto: ExportInvoicesDto)`
- Generates Excel file using ExcelJS library
- Exports all invoice fields including:
  - Invoice details (number, date, type)
  - Supplier and buyer information
  - Product details (name, HSN, quantity, rate, amount)
  - Vehicle/truck information
  - User information
  - Claim status
  - Timestamps
- Formats currency columns (amount, rate)
- Returns Excel buffer

### 4. Added Admin Endpoints

**File**: `src/modules/invoices/invoices.controller.ts`

**New Endpoint**: `GET /invoices/admin/filter`
- Query parameters: All fields from FilterInvoicesDto
- Returns filtered list of invoices
- Example: `GET /invoices/admin/filter?invoiceType=SUPPLIER_INVOICE&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z`

**New Endpoint**: `POST /invoices/admin/export`
- Request body: ExportInvoicesDto
- Returns Excel file (.xlsx)
- Sets proper Content-Type and Content-Disposition headers
- Filename includes timestamp

### 5. Dependencies Added

**File**: `package.json`
- Added `exceljs: ^4.4.0` for Excel file generation
- Added `@types/exceljs: ^0.0.2` for TypeScript types

## API Usage Examples

### Filter Supplier Invoices

```bash
GET /invoices/admin/filter?invoiceType=SUPPLIER_INVOICE&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z
```

### Filter Buyer Invoices

```bash
GET /invoices/admin/filter?invoiceType=BUYER_INVOICE&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z
```

### Export Invoices to Excel

```bash
POST /invoices/admin/export
Content-Type: application/json

{
  "invoiceType": "SUPPLIER_INVOICE",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.999Z"
}
```

### Export Specific Invoices

```bash
POST /invoices/admin/export
Content-Type: application/json

{
  "invoiceIds": ["invoice-id-1", "invoice-id-2", "invoice-id-3"]
}
```

## Database Migration

**Important**: Run the migration before deploying:

```bash
pnpm run migration:run
```

This will:
1. Create the `invoice_type_enum` PostgreSQL enum type
2. Add the `invoiceType` column to the `invoices` table
3. Set default value `SUPPLIER_INVOICE` for existing records

## Breaking Changes

### For Existing Invoices

- All existing invoices will have `invoiceType = SUPPLIER_INVOICE` by default after migration
- If you need to update existing invoices, you'll need to:
  1. Identify which invoices should be `BUYER_INVOICE`
  2. Update them manually via the update endpoint or direct database query

### For Invoice Creation

- `invoiceType` is now optional in CreateInvoiceDto
- If not provided, defaults to `SUPPLIER_INVOICE`
- **Recommendation**: Always specify `invoiceType` when creating invoices to ensure accuracy

## Testing Checklist

- [ ] Run database migration
- [ ] Test creating invoice with `invoiceType = SUPPLIER_INVOICE`
- [ ] Test creating invoice with `invoiceType = BUYER_INVOICE`
- [ ] Test filtering by invoice type
- [ ] Test filtering by date range
- [ ] Test filtering by supplier name
- [ ] Test filtering by buyer name
- [ ] Test filtering by user ID
- [ ] Test Excel export with date range
- [ ] Test Excel export with specific invoice IDs
- [ ] Verify Excel file opens correctly and contains all expected columns
- [ ] Verify currency formatting in Excel

## Future Enhancements

1. Add pagination to filter endpoint
2. Add sorting options (by date, amount, etc.)
3. Add more export formats (CSV, PDF)
4. Add export templates with custom formatting
5. Add bulk update for invoice types
6. Add analytics/statistics endpoints based on invoice types

