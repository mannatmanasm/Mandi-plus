## Claims & Damage Flow – Frontend Integration Guide

This doc explains how a frontend client should integrate all **claim request** features:

- Create claim request by **truck number**
- List & filter claim requests (admin)
- Update claim status (support / admin)
- Upload supporting media (evidence)
- Submit **damage certificate form** and trigger `generate-damage-form-pdf`

All examples assume base URL `http://localhost:3005`.

---

## 1. Create Claim Request by Truck Number

### Endpoint

- **POST** `/claim-requests/by-truck`

### Purpose

- Given a **truckNumber**, the backend:
  - Finds the **latest invoice** linked to that truck
  - Ensures invoice is marked as `isClaim = true`
  - Ensures no existing claim request for that invoice
  - Creates a new `ClaimRequest` (status = `pending`)
  - Increments `truck.claimCount`

### Request

```ts
// TypeScript interface
interface CreateClaimByTruckPayload {
  truckNumber: string;
}
```

```ts
// Example using fetch
const createClaimByTruck = async (truckNumber: string) => {
  const res = await fetch('/claim-requests/by-truck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ truckNumber }),
  });

  if (!res.ok) {
    // Handle 400/404/409
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create claim request');
  }

  return res.json(); // ClaimRequest object
};
```

### Response (shape)

```json
{
  "id": "claim-request-uuid",
  "status": "pending",
  "supportedMedia": [],
  "claimFormUrl": null,
  "invoice": {
    "id": "invoice-uuid",
    "invoiceNumber": "INV-2026-000056",
    "truck": { "truckNumber": "RJ06 GE 3036", ... },
    "user": { "id": "user-uuid", "mobileNumber": "+91..." },
    ...
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 2. Admin: List & Filter Claim Requests

### Endpoint

- **GET** `/claim-requests/admin`

### Query Params

- `status` (optional): `pending | inprogress | surveyor_assigned | completed`
- `invoiceId` (optional): invoice UUID
- `truckNumber` (optional): partial truck number match (ILIKE in DB)

### Example

```ts
const fetchClaims = async (filters: {
  status?: string;
  invoiceId?: string;
  truckNumber?: string;
} = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.invoiceId) params.append('invoiceId', filters.invoiceId);
  if (filters.truckNumber) params.append('truckNumber', filters.truckNumber);

  const res = await fetch(`/claim-requests/admin?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch claim requests');
  return res.json(); // ClaimRequest[]
};
```

Use this for:

- Admin dashboard table of claims
- Filters by status / truck / invoice

---

## 3. Update Claim Status

### Endpoint

- **PATCH** `/claim-requests/:id/status`

### Status Values

From `ClaimStatus` enum:

- `pending`
- `inprogress`
- `surveyor_assigned`
- `completed`

When status is `surveyor_assigned`, **backend requires** `surveyorName` and `surveyorContact`.

### Payload

```ts
interface UpdateClaimStatusPayload {
  status: 'pending' | 'inprogress' | 'surveyor_assigned' | 'completed';
  surveyorName?: string;
  surveyorContact?: string;
  notes?: string;
}
```

```ts
const updateClaimStatus = async (
  claimRequestId: string,
  payload: UpdateClaimStatusPayload,
) => {
  const res = await fetch(`/claim-requests/${claimRequestId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update claim status');
  }

  return res.json(); // Updated ClaimRequest
};
```

---

## 4. Upload Supporting Media (Evidence)

### Endpoint

- **POST** `/claim-requests/:id/supporting-media`
- **Content-Type**: `multipart/form-data`

### Notes

- Field name: `files`
- Accepts **multiple** files
- Max 10 files, 10MB each (enforced by backend)
- Allowed types: `jpg, jpeg, png, gif, pdf, doc, docx, txt`
- Backend:
  - Uploads to Cloudinary via existing `StorageService`
  - Appends URLs to `supportedMedia` array on `ClaimRequest`

### Example (browser / React)

```ts
const uploadClaimEvidence = async (
  claimRequestId: string,
  files: File[],
) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const res = await fetch(`/claim-requests/${claimRequestId}/supporting-media`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to upload supporting media');
  }

  return res.json(); // Updated ClaimRequest
};
```

UI suggestion:

- Show a list of existing `supportedMedia` URLs with icons / preview.
- Allow multiple upload; after success, refresh the claim details.

---

## 5. Damage Certificate Form & PDF Generation

This is the **damage certificate** form that matches the sample image.  
It is submitted once per claim request and generates a PDF in the background.

### Endpoint

- **POST** `/claim-requests/:id/damage-form`
- **Content-Type**: `application/json`
- **Returns**: `202 Accepted` + `{ message, claimRequestId }`

### Payload Shape

```ts
interface DamageFormPayload {
  damageCertificateDate: string;        // "2026-01-09"
  transportReceiptMemoNo: string;      // "Memo No 416"
  transportReceiptDate: string;        // "2026-01-07"
  loadedWeightKg: number;              // 15400
  productName: string;                 // "Sweet Potato"
  fromParty: string;                   // "Sandeep Yadav, Hassan, Karnataka, India"
  forParty: string;                    // "KSRT AGROMART PVT LTD, Muhana Mandi, Jaipur, RJ"
  accidentDate: string;                // "2026-01-09"
  accidentLocation: string;            // "Aurangabad-Solapur Highway, Pachdol (MH) 431121"
  accidentDescription: string;         // free text
  agreedDamageAmountNumber?: number;   // e.g. 50000
  agreedDamageAmountWords?: string;    // "Fifty Thousand Only"
  authorizedSignatoryName?: string;    // "Subramanya T R"
}
```

### Example Call

```ts
const submitDamageForm = async (
  claimRequestId: string,
  payload: DamageFormPayload,
) => {
  const res = await fetch(`/claim-requests/${claimRequestId}/damage-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit damage form');
  }

  return res.json(); // { message, claimRequestId }
};
```

### Backend Behavior (for frontend understanding)

- Validates that the `ClaimRequest` exists and is linked to an `Invoice`.
- Uses:
  - `invoice.invoiceNumber`
  - `invoice.invoiceDate`
  - `invoice.truck.truckNumber`
  - `invoice.user.mobileNumber`
- Enqueues a job in `claim-form-pdf` queue (`generate-damage-form-pdf`).
- The job:
  - Calls `PdfService.generateDamageCertificatePdf(payload + invoice info)`
  - Uploads PDF to Cloudinary under `mandi-plus/claim-forms/`
  - Stores URL in `claimRequest.claimFormUrl`

**Important:**  
The response is **202 Accepted** – PDF is generated async.  

