# Invoice Creation Flow - Implementation Guide

This document explains the complete flow of how invoice creation works in the Mandi Plus API, from user registration to PDF generation.

## Complete Flow Overview

### STEP 1: User Registration (if not already registered)

**Endpoint:** `POST /users`

**Request:**
```json
{
  "mobileNumber": "+919876543210",
  "state": "Maharashtra",
  "name": "John Doe"  // optional
}
```

- User is created in database with basic info
- User can later update full profile details via `PATCH /users/:id`

---

### STEP 2: User Creates Invoice

**Endpoint:** `POST /invoices` (multipart/form-data)

**Request includes:**
- **Form fields:**
  - `invoiceNumber`: "INV-2024-001"
  - `invoiceDate`: "2024-01-15"
  - `supplierName`: "ABC Suppliers"
  - `supplierAddress`: ["123 Main St", "Mumbai"]
  - `billToName`: "XYZ Traders"
  - `billToAddress`: ["456 Market St", "Delhi"]
  - `shipToName`: "XYZ Traders"
  - `shipToAddress`: ["456 Market St", "Delhi"]
  - `productName`: ["Wheat", "Rice"]
  - `quantity`: 100.5
  - `rate`: 50.75
  - `amount`: 5082.50
  - `truckNumber`: "MH12AB1234" ⭐
  - `weighmentSlipNote`: "Optional note"
  - Other optional fields...

- **Files:**
  - `weighmentSlips[]`: One or more image files (up to 10)

---

### STEP 3: Invoice Controller Receives Request

**Location:** `src/invoices/invoices.controller.ts`

```typescript
@Post()
@UseInterceptors(FilesInterceptor('weighmentSlips', 10))
@UsePipes(new ParseFormDataPipe())
```

**What happens:**
- `FilesInterceptor` captures weighment slip files from multipart/form-data
- `ParseFormDataPipe` converts form data:
  - Arrays from JSON strings or comma-separated values
  - String numbers → actual numbers
  - String booleans → actual booleans
- Calls `invoicesService.create()`

---

### STEP 4: Invoice Service - Validate Invoice Number

**Location:** `src/invoices/invoices.service.ts` (lines 33-42)

**What happens:**
- Checks if invoice number already exists in database
- If duplicate → throws `ConflictException`
- If unique → continues

---

### STEP 5: Handle Truck by Truck Number

**Location:** `src/invoices/invoices.service.ts` (lines 44-63)

**Logic:**
1. If `truckNumber` is provided:
   - Search database for truck with that number
   - **If found:** Use existing truck
   - **If NOT found:** Create new truck with default values:
     ```typescript
     {
       truckNumber: "MH12AB1234",
       ownerName: "Unknown",           // Default, update later
       ownerContactNumber: "0000000000", // Default, update later
       driverName: "Unknown",          // Default, update later
       driverContactNumber: "0000000000" // Default, update later
     }
     ```
   - Save new truck to database
   - Attach truck to invoice

2. If `truckNumber` is NOT provided:
   - Invoice is created without truck association

---

### STEP 6: Upload Weighment Slips to Cloud Storage

**Location:** `src/invoices/invoices.service.ts` (lines 65-72)

**What happens:**
1. If weighment slip files are provided:
   - `storageService.uploadMultipleFiles()` is called
   - Files are uploaded to Cloudinary (folder: `mandi-plus/weighment-slips`)
   - Returns array of URLs: 
     ```typescript
     [
       "https://res.cloudinary.com/.../image1.jpg",
       "https://res.cloudinary.com/.../image2.jpg"
     ]
     ```
2. URLs are stored in `weighmentSlipUrls` array field

---

### STEP 7: Create Invoice Record in Database

**Location:** `src/invoices/invoices.service.ts` (lines 74-105)

**What happens:**
1. Build invoice data object with all fields
2. Convert `productName` array to JSON string (database limitation: column is varchar, not array)
3. Attach truck if provided
4. Save invoice to database
5. Invoice now exists with:
   - ✅ All invoice details
   - ✅ `weighmentSlipUrls`: Array of uploaded image URLs
   - ❌ `pdfUrl`: `null` (will be set later by background job)

---

### STEP 8: Queue PDF Generation Job (Async)

**Location:** `src/invoices/invoices.service.ts` (lines 107-110)

**What happens:**
```typescript
await this.invoicePdfQueue.add('generate-pdf', {
  invoiceId: savedInvoice.id,
});
```

- Job is added to BullMQ queue (`invoice-pdf` queue)
- Job contains only `invoiceId`
- **API returns immediately** - does NOT wait for PDF generation
- User receives invoice response with `pdfUrl: null`

**Why Async?**
- PDF generation can take time (especially with images)
- Uploading images and generating PDF is CPU-intensive
- Async processing prevents API timeout
- Better user experience (fast response)

---

### STEP 9: BullMQ Processor Picks Up Job (Background)

**Location:** `src/queue/processors/invoice-pdf.processor.ts` (lines 28-42)

**What happens:**
1. BullMQ worker (running in background) picks up the job
2. `InvoicePdfProcessor.process()` is called
3. Fetches invoice from database:
   ```typescript
   const invoice = await this.invoiceRepository.findOne({
     where: { id: invoiceId },
     relations: ['truck'], // Include truck relationship
   });
   ```
4. Validates invoice exists

---

### STEP 10: Generate PDF with Weighment Slips

**Location:** `src/pdf/pdf.service.ts`

**What happens:**
1. `pdfService.generateInvoicePdf()` is called with:
   - Invoice data (all fields)
   - Array of weighment slip URLs
2. PDFKit creates PDF document
3. Adds invoice header, details, items table
4. **Embeds weighment slip images:**
   - Downloads images from URLs
   - Resizes using Sharp library
   - Embeds in PDF (2 images per row)
   - Handles multiple images across pages if needed
5. Returns PDF as `Buffer`

---

### STEP 11: Upload PDF to Cloud Storage

**Location:** `src/queue/processors/invoice-pdf.processor.ts` (lines 50-56)

**What happens:**
1. Generate filename: `invoice-{invoiceNumber}-{timestamp}.pdf`
2. Upload PDF buffer to Cloudinary:
   ```typescript
   await this.storageService.uploadPdf(
     pdfBuffer,
     pdfFilename,
     'invoice-pdfs'
   );
   ```
3. Returns PDF URL:
   ```
   https://res.cloudinary.com/.../invoice-INV-2024-001-1703123456789.pdf
   ```

---

### STEP 12: Update Invoice with PDF URL

**Location:** `src/queue/processors/invoice-pdf.processor.ts` (lines 58-60)

**What happens:**
```typescript
invoice.pdfUrl = pdfUrl;
await this.invoiceRepository.save(invoice);
```

- Updates invoice record in database
- Sets `pdfUrl` field
- ✅ **Invoice is now complete!**

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User Registration                                       │
│ POST /users → Create user with mobileNumber & state             │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Create Invoice Request                                  │
│ POST /invoices (multipart/form-data)                            │
│ - Invoice data + weighmentSlips files + truckNumber             │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Controller Processing                                   │
│ - FilesInterceptor captures files                               │
│ - ParseFormDataPipe converts form data                          │
│ - Calls invoicesService.create()                                │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4-7: Invoice Service (Synchronous)                        │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ STEP 4: Validate invoice number (check duplicate)        │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ STEP 5: Handle truck                                     │   │
│ │   - Find truck by number OR create new truck             │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ STEP 6: Upload weighment slips to Cloudinary             │   │
│ │   - Get array of URLs                                    │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ STEP 7: Save invoice to database                         │   │
│ │   - Invoice saved with weighmentSlipUrls                 │   │
│ │   - pdfUrl = null (not generated yet)                    │   │
│ └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: Queue PDF Generation Job                                │
│ - Add job to BullMQ queue (invoice-pdf)                         │
│ - Job contains: { invoiceId: "uuid-here" }                      │
│ - API returns invoice response (pdfUrl = null)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
                    [ASYNC PROCESSING]
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: BullMQ Processor (Background)                           │
│ - Worker picks up job                                           │
│ - Fetch invoice from database with truck relation               │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: Generate PDF                                           │
│ - PdfService.generateInvoicePdf()                               │
│ - Download weighment slip images                                │
│ - Create PDF with PDFKit                                        │
│ - Embed images in PDF                                           │
│ - Return PDF as Buffer                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: Upload PDF to Cloudinary                               │
│ - Upload PDF buffer                                             │
│ - Get PDF URL                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 12: Update Invoice                                         │
│ - Set invoice.pdfUrl = PDF URL                                  │
│ - Save invoice to database                                      │
│ ✅ Invoice Complete!                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Important Notes

### 1. Async PDF Generation
- PDF generation happens **asynchronously** in the background
- API response returns immediately with `pdfUrl: null`
- PDF URL is available later (typically within seconds)
- User should poll or use webhooks to check when PDF is ready

### 2. Truck Auto-Creation
- If truck with provided number doesn't exist, it's automatically created
- Created truck has default placeholder values:
  - `ownerName`: "Unknown"
  - `ownerContactNumber`: "0000000000"
  - `driverName`: "Unknown"
  - `driverContactNumber`: "0000000000"
- These should be updated later via `PATCH /trucks/:id`

### 3. Weighment Slip Storage
- Images are uploaded to Cloudinary immediately during invoice creation
- URLs are stored in `weighmentSlipUrls` array
- PDF processor downloads these images when generating PDF
- Images are embedded directly in the PDF document

### 4. Error Handling
- If PDF generation fails, job will retry (BullMQ default retry logic)
- Check logs for PDF generation errors
- Invoice remains in database even if PDF generation fails
- PDF can be regenerated by updating the invoice

### 5. Database Fields
- `productName` is stored as JSON string (database limitation)
- `weighmentSlipUrls` is stored as text array
- `pdfUrl` is stored as text (nullable)

---

## API Response Examples

### Create Invoice Response (Immediate)
```json
{
  "id": "uuid-here",
  "invoiceNumber": "INV-2024-001",
  "pdfUrl": null,  // ⚠️ PDF not ready yet
  "weighmentSlipUrls": [
    "https://res.cloudinary.com/.../slip1.jpg",
    "https://res.cloudinary.com/.../slip2.jpg"
  ],
  "truck": {
    "id": "truck-uuid",
    "truckNumber": "MH12AB1234"
  },
  // ... other invoice fields
}
```

### Get Invoice Response (After PDF Generation)
```json
{
  "id": "uuid-here",
  "invoiceNumber": "INV-2024-001",
  "pdfUrl": "https://res.cloudinary.com/.../invoice-INV-2024-001-1234567890.pdf",  // ✅ PDF ready
  "weighmentSlipUrls": [
    "https://res.cloudinary.com/.../slip1.jpg",
    "https://res.cloudinary.com/.../slip2.jpg"
  ],
  // ... other invoice fields
}
```

---

## Prerequisites

1. **Redis Server** must be running (for BullMQ)
2. **Cloudinary** credentials configured in environment
3. **PostgreSQL** database with migrations run
4. **BullMQ Worker** must be running (handled automatically by NestJS)

---

## Environment Variables Required

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASS=your_password
DB_NAME=your_database

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

