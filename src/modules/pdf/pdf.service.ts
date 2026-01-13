import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import sharp from 'sharp';

const MANDI_PLUS_LOGO_URL =
  'https://res.cloudinary.com/dur7vlvdw/image/upload/v1766996140/mandiPlusLogo_glmnlu.png';

@Injectable()
export class PdfService {
  async generateInvoicePdf(
    invoiceData: any,
    weighmentSlipUrls: string[] = [],
    stampImageUrl?: string,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const margin = 40;
        const doc = new PDFDocument({ margin: margin, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - margin * 2;
        const rightEdgeX = margin + pageWidth;

        // --- HEADER SECTION (Logo Left, Invoice Box Right) ---
        const HEADER_Y = margin;
        let headerBottomY = HEADER_Y;

        /* 1. LOGO (Top Left - Bigger) */
        const LOGO_WIDTH = 140;

        try {
          const logoResp = await axios.get(MANDI_PLUS_LOGO_URL, {
            responseType: 'arraybuffer',
          });

          const logoImg = await sharp(logoResp.data)
            .resize(LOGO_WIDTH * 4, null)
            .toBuffer();

          const LOGO_Y = HEADER_Y - 45;
          doc.image(logoImg, margin, LOGO_Y, { width: LOGO_WIDTH });

          headerBottomY = HEADER_Y + 45;
        } catch (logoErr) {
          console.warn('Could not load MandiPlus logo:', logoErr.message);
          doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .fillColor('#4309ac')
            .text('MandiPlus', margin, HEADER_Y);
          headerBottomY = HEADER_Y + 25;
        }

        /* 2. INVOICE BOX (Top Right - Bigger) */
        const INVOICE_BOX_W = 120;
        const INVOICE_BOX_H = 35;
        const INVOICE_BOX_X = rightEdgeX - INVOICE_BOX_W;

        doc
          .roundedRect(INVOICE_BOX_X, HEADER_Y, INVOICE_BOX_W, INVOICE_BOX_H, 3)
          .dash(3, { space: 2 })
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke()
          .undash();

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('INVOICE', INVOICE_BOX_X, HEADER_Y + 10, {
            width: INVOICE_BOX_W,
            align: 'center',
          });

        headerBottomY = Math.max(headerBottomY, HEADER_Y + INVOICE_BOX_H);

        // --- HORIZONTAL LINE ---
        let y = headerBottomY + 20;

        doc
          .moveTo(margin, y)
          .lineTo(rightEdgeX, y)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();

        y += 15;

        /* ---------- GRID: INVOICE DETAILS (LEFT) & SUPPLIER DETAILS (RIGHT) ---------- */
        const leftColX = margin;
        const rightColX = 320;
        const startY = y;
        const boxHeight = 90;

        // --- LEFT BOX: Invoice Details ---
        doc
          .roundedRect(leftColX, startY, 270, boxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Invoice Number :', leftColX + 15, startY + 12);
        doc.text(invoiceData.invoiceNumber, leftColX + 105, startY + 12);

        doc.text('Invoice Date', leftColX + 15, startY + 27);
        doc.text(':', leftColX + 105, startY + 27);
        doc.text(
          new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB'),
          leftColX + 110,
          startY + 27,
        );

        doc.text('Terms', leftColX + 15, startY + 42);
        doc.text(':', leftColX + 105, startY + 42);
        doc.text(invoiceData.terms || 'CUSTOM', leftColX + 110, startY + 42);

        // --- RIGHT BOX: Supplier Details (Name, Address, Place) ---
        doc
          .roundedRect(rightColX, startY, 235, boxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#666666')
          .text('Supplier Details', rightColX + 15, startY + 8);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(
            `Supplier Name: ${invoiceData.supplierName}`,
            rightColX + 15,
            startY + 22,
          );

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(
            `Place of Supply: ${invoiceData.placeOfSupply}`,
            rightColX + 15,
            startY + 38 + 2,
          );

        y = startY + boxHeight + 15;

        /* ---------- BILL TO / SHIP TO ---------- */
        const billShipY = y;
        const billShipBoxHeight = 75;

        // Bill To
        doc
          .roundedRect(leftColX, billShipY, 270, billShipBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Bill To', leftColX + 15, billShipY + 12);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(invoiceData.billToName, leftColX + 15, billShipY + 25);
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(
            Array.isArray(invoiceData.billToAddress)
              ? invoiceData.billToAddress.join('\n')
              : String(invoiceData.billToAddress),
            leftColX + 15,
            billShipY + 40,
            { width: 240, lineGap: 2 },
          );

        // Ship To
        doc
          .roundedRect(rightColX, billShipY, 235, billShipBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(11)
          .font('Helvetica')
          .text('Ship To', rightColX + 15, billShipY + 12);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(invoiceData.shipToName, rightColX + 15, billShipY + 25);
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(
            Array.isArray(invoiceData.shipToAddress)
              ? invoiceData.shipToAddress.join('\n')
              : String(invoiceData.shipToAddress),
            rightColX + 15,
            billShipY + 40,
            { width: 205, lineGap: 2 },
          );

        y = billShipY + billShipBoxHeight + 15;

        /* ---------- ITEMS TABLE ---------- */
        const tableX = margin;
        const tableY = y;
        const tableWidth = pageWidth;
        const cols = {
          hash: tableX + 8,
          item: tableX + 30,
          hsn: tableX + 200,
          qty: tableX + 280,
          rate: tableX + 330,
          amount: tableX + 410,
        };
        const headerHeight = 24;
        const rowHeight = 30;

        doc
          .rect(tableX, tableY, tableWidth, headerHeight)
          .fillAndStroke('#F0F0F0', '#000000')
          .lineWidth(0.5);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('#', cols.hash, tableY + 7)
          .text('Item & Description', cols.item, tableY + 7)
          .text('HSN/SAC', cols.hsn, tableY + 7)
          .text('Qty', cols.qty, tableY + 7)
          .text('Rate', cols.rate, tableY + 7)
          .text('Amount', cols.amount, tableY + 7);

        const rowY = tableY + headerHeight;
        doc
          .rect(tableX, rowY, tableWidth, rowHeight)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();

        const qty = Number(invoiceData.quantity || 0);
        const rate = Number(invoiceData.rate || 0);
        const amount = Number(invoiceData.amount || 0);
        const premiumAmount = Number((amount * 0.002).toFixed(2)); // 0.2%

        const productName = Array.isArray(invoiceData.productName)
          ? invoiceData.productName[0]
          : invoiceData.productName;

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text('1', cols.hash, rowY + 9)
          .text(productName, cols.item, rowY + 9, {
            width: cols.hsn - cols.item - 10,
          })
          .text(invoiceData.hsnCode || '-', cols.hsn, rowY + 9)
          .text(qty.toString(), cols.qty, rowY + 9)
          .text(`Rs. ${rate.toFixed(2)}`, cols.rate, rowY + 9)
          .text(`Rs. ${amount.toFixed(2)}`, cols.amount, rowY + 9, {
            width: 100,
            align: 'left',
            lineBreak: false,
          });

        y = rowY + rowHeight + 15;

        /* ---------- NOTES ---------- */
        const notesBoxHeight = 110;
        doc
          .roundedRect(margin, y, 360, notesBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Notes', margin + 10, y + 10);

        const note = (invoiceData.weighmentSlipNote || '').toLowerCase().trim();
        const isCash =
          note.includes('cash') || note.includes('nak') || note.includes('nag');
        const insuredPerson = isCash
          ? invoiceData.billToName
          : invoiceData.supplierName;

        doc.text(
          `Vehicle No : ${invoiceData.vehicleNumber || '-'}`,
          margin + 10,
          y + 25,
        );
        doc.text(
          `Transporter Name : ${invoiceData.ownerName || '-'}`,
          margin + 10,
          y + 38,
        );

        const productNameForNotes = Array.isArray(invoiceData.productName)
          ? invoiceData.productName[0]
          : invoiceData.productName;
        doc
          .fontSize(8) // Reduced from 9 to 8
          .font('Helvetica')
          .text(
            `This vehicle is transporting ${productNameForNotes} from Supplier: ${invoiceData.supplierName} to Buyer: ${invoiceData.billToName}.`,
            margin + 10,
            y + 52, // Adjusted
            { width: 300, align: 'left', lineGap: 0 },
          );
        doc.text(
          `\nIn case of any accident, loss, or damage during transit, ${insuredPerson} shall be treated as the insured person and will be entitled to receive all claim amounts for the damaged goods.`,
          margin + 10,
          y + 68, // Adjusted
          { width: 300, align: 'left', lineGap: 1 },
        );

        // Sub Total
        const subTotalX = 410;
        doc
          .roundedRect(subTotalX, y, 145, 60, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(' Total', subTotalX + 10, y + 15);
        doc
          .fontSize(12)
          .text(`Rs. ${amount.toFixed(2)}`, subTotalX + 10, y + 33);
        // Premium Amount (0.2%)
        const premiumBoxY = y + 65;

        doc
          .roundedRect(subTotalX, premiumBoxY, 145, 60, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(' Insurance Amount (0.2%)', subTotalX + 10, premiumBoxY + 15);

        doc
          .fontSize(12)
          .text(
            `Rs ${premiumAmount.toFixed(2)}`,
            subTotalX + 10,
            premiumBoxY + 33,
          );

        y += notesBoxHeight + 15; // Reduced spacing from 25 to 15

        /* ---------- WEIGHMENT SLIP & TERMS AND CONDITIONS (Halves) ---------- */

        const GAP = 15;
        const COL_WIDTH = (pageWidth - GAP) / 2;

        const LEFT_COL_X = margin;
        const RIGHT_COL_X = margin + COL_WIDTH + GAP;

        const SECTION_HEIGHT = 260; // Increased from 200 to 260

        //  1. WEIGHMENT SLIP (Left Half)
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Weightment Slip', LEFT_COL_X, y);

        const boxStartY = y + 15;

        doc
          .roundedRect(LEFT_COL_X, boxStartY, COL_WIDTH, SECTION_HEIGHT, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        if (weighmentSlipUrls && weighmentSlipUrls.length > 0) {
          try {
            const resp = await axios.get(weighmentSlipUrls[0], {
              responseType: 'arraybuffer',
            });

            const highResWidth = COL_WIDTH * 3;
            const highResHeight = SECTION_HEIGHT * 3;

            const img = await sharp(resp.data)
              .resize(Math.round(highResWidth), Math.round(highResHeight), {
                fit: 'inside',
              })
              .jpeg({ quality: 100 })
              .toBuffer();

            doc.image(img, LEFT_COL_X + 10, boxStartY + 10, {
              fit: [COL_WIDTH - 20, SECTION_HEIGHT - 20],
            });
          } catch (imgErr) {
            console.error('Failed to load weighment slip image:', imgErr);
          }
        }

        /* ---------- TERMS AND CONDITIONS ---------- */

        // Heading OUTSIDE box (same as weighment)
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Insurance Terms and Conditions', RIGHT_COL_X, y);

        const termsBoxY = y + 15;
        const PADDING = 10;
        const textX = RIGHT_COL_X + PADDING;
        let textY = termsBoxY + PADDING;
        const textWidth = COL_WIDTH - PADDING * 2;

        doc.fontSize(7.8).font('Helvetica');

        doc
          .font('Helvetica-Bold')
          .text('1. Scope of Claim Eligibility :', textX, textY, {
            width: textWidth,
          });

        textY = doc.y + 4;

        doc
          .font('Helvetica')
          .text(
            '• Vehicle accident, collision, or overturning during transit.\n' +
              '• Theft, hijacking, or unlawful removal of the cargo.\n' +
              '• Shortage or Missing Goods: Claims are admissible only when the difference between loading and unloading weighment slips exceeds 2 Tons.\n' +
              '• Loss due to looting, strikes, riots, protests, or civil commotion.\n' +
              '• Damage caused by adverse weather conditions or natural calamities.\n' +
              '• Fire, explosion, or related perils.\n' +
              '• Loss caused due to driver fraud, negligence, or wilful misconduct.\n',
            textX,
            textY,
            { width: textWidth, lineGap: 1.7 },
          );

        textY = doc.y + 5;

        doc
          .font('Helvetica-Bold')
          .text(
            '2. Mandatory Documentation for Claim Processing :',
            textX,
            textY,
            { width: textWidth },
          );

        textY = doc.y + 4;

        doc
          .font('Helvetica')
          .text(
            '• Photographs or videos of the damaged goods or incident.\n' +
              '• Copy of FIR and original Invoice.\n' +
              '• Damage Certificate and Letter of Subrogation.\n' +
              '• Insurance Certificate and Proof of Delivery (POD) issued at unloading.\n',
            textX,
            textY,
            { width: textWidth, lineGap: 1.5 },
          );

        textY = doc.y + 5;

        doc
          .font('Helvetica-Bold')
          .text('3. Dispute Resolution & Communication :', textX, textY, {
            width: textWidth,
          });

        textY = doc.y + 3;

        doc
          .font('Helvetica')
          .text(
            'All claim-related communication must be made via email at support@mandiplus.com  Mob No: +91 99001 86757 ',
            textX,
            textY,
            { width: textWidth, lineGap: 1.8 },
          );

        const contentEndY = doc.y;

        const TERMS_BOX_HEIGHT = contentEndY - termsBoxY + PADDING;

        doc
          .roundedRect(RIGHT_COL_X, termsBoxY, COL_WIDTH, TERMS_BOX_HEIGHT, 5)
          .strokeColor('#CCCCCC')
          .stroke();

        /* ---------- STAMP IMAGE ---------- */
        if (stampImageUrl) {
          try {
            const stampResp = await axios.get(stampImageUrl, {
              responseType: 'arraybuffer',
            });
            const stampImg = await sharp(stampResp.data)
              .resize(240, 240, { fit: 'inside' })
              .jpeg({ quality: 100 })
              .toBuffer();
            doc.image(stampImg, 460, y + 20, { width: 80 });
          } catch (stampErr) {
            console.error('Failed to load stamp image:', stampErr);
          }
        }

        doc.end();
      } catch (err: any) {
        reject(
          new BadRequestException(
            `PDF generation failed: ${err?.message || err}`,
          ),
        );
      }
    });
  }

  async generateDamageCertificatePdf(payload: {
    claimRequestId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    truckNumber: string;
    userMobileNumber: string;
    damageCertificateDate: string;
    transportReceiptMemoNo: string;
    transportReceiptDate: string;
    loadedWeightKg: number;
    productName: string;
    fromParty: string;
    forParty: string;
    accidentDate: string;
    accidentLocation: string;
    accidentDescription: string;
    agreedDamageAmountNumber?: number;
    agreedDamageAmountWords?: string;
    authorizedSignatoryName?: string;
  }): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const margin = 50;
        const doc = new PDFDocument({ margin, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - margin * 2;
        const rightEdgeX = margin + pageWidth;

        // --- HEADER SECTION ---
        const HEADER_Y = margin;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(
            'DAMAGE CERTIFICATE',
            margin,
            HEADER_Y,
            { width: pageWidth, align: 'center' },
          );

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            '(from Transporter Agent / Owner)',
            margin,
            HEADER_Y + 22,
            { width: pageWidth, align: 'center' },
          );

        // Horizontal line after header
        let y = HEADER_Y + 50;
        doc
          .moveTo(margin, y)
          .lineTo(rightEdgeX, y)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();

        y += 30;

        // Form-style layout constants
        const labelStartX = margin;
        const baseLineSpacing = 25;
        const fontSize = 10;
        const valueGap = 8; // Gap between label and value

        // Helper function to add a form field with proper spacing
        const addFormField = (
          label: string,
          value: string,
          isBoldValue = true,
          allowWrap = true,
        ) => {
          doc.fontSize(fontSize).font('Helvetica').fillColor('#000000');

          // Calculate label width
          const labelWidth = doc.widthOfString(label);
          const valueStartX = labelStartX + labelWidth + valueGap;
          const maxValueWidth = rightEdgeX - valueStartX - 15; // Extra margin for safety

          // Draw label
          doc.text(label, labelStartX, y);

          // Draw value
          if (!value) {
            y += baseLineSpacing;
            return;
          }

          doc.font(isBoldValue ? 'Helvetica-Bold' : 'Helvetica');

          if (allowWrap) {
            // Calculate how many lines the text will take
            const textHeight = doc.heightOfString(value, {
              width: maxValueWidth,
            });
            const lineHeight = fontSize * 1.2; // Approximate line height
            const numLines = Math.ceil(textHeight / lineHeight);

            // Draw the text
            doc.text(value, valueStartX, y, {
              width: maxValueWidth,
              lineGap: 5,
            });

            // Update y position - use actual calculated height
            y += Math.max(baseLineSpacing, textHeight + 10);
          } else {
            doc.text(value, valueStartX, y);
            y += baseLineSpacing;
          }
        };

        // Certificate date - date on right side
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('We certified that on dated', labelStartX, y);
        
        // Date on right side
        const certDateText = payload.damageCertificateDate || '';
        doc.font('Helvetica-Bold');
        const certDateWidth = doc.widthOfString(certDateText);
        doc.text(certDateText, rightEdgeX - certDateWidth, y);
        
        y += baseLineSpacing + 3;

        // Transport receipt - using "Transport Lorry Receipt No."
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Under our Transport Lorry Receipt No.', labelStartX, y);

        const receiptLabelWidth = doc.widthOfString('Under our Transport Lorry Receipt No.');
        const receiptValueX = labelStartX + receiptLabelWidth + valueGap;

        // Direct receipt number (remove any "Memo No." prefix if present)
        let receiptNumber = payload.transportReceiptMemoNo || '';
        receiptNumber = receiptNumber.replace(/^Memo\s*No\.?\s*/i, '').trim();
        doc
          .font('Helvetica-Bold')
          .text(receiptNumber, receiptValueX, y);

        // Date on right side
        const receiptDateText = payload.transportReceiptDate || '';
        const receiptDateLabel = 'Date';
        doc.font('Helvetica');
        const receiptDateLabelWidth = doc.widthOfString(receiptDateLabel);
        doc.font('Helvetica-Bold');
        const receiptDateValueWidth = doc.widthOfString(receiptDateText);
        const receiptDateX = rightEdgeX - receiptDateValueWidth - receiptDateLabelWidth - 15;
        
        doc.font('Helvetica').text(receiptDateLabel, receiptDateX, y);
        doc
          .font('Helvetica-Bold')
          .text(receiptDateText, rightEdgeX - receiptDateValueWidth, y);

        y += baseLineSpacing + 3;

        // Loaded goods - special handling with better spacing
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('We have loaded', labelStartX, y);

        const loadedLabelWidth = doc.widthOfString('We have loaded');
        let currentX = labelStartX + loadedLabelWidth + valueGap;

        // Weight
        const weightText = `${payload.loadedWeightKg || 0} KG`;
        doc.font('Helvetica-Bold').text(weightText, currentX, y);
        currentX += doc.widthOfString(weightText) + 5;

        // "Pieces / Boxes / Bags of"
        const piecesText = ' Pieces / Boxes / Bags of ';
        doc.font('Helvetica').text(piecesText, currentX, y);
        currentX += doc.widthOfString(piecesText);

        // Product name
        doc
          .font('Helvetica-Bold')
          .text(payload.productName || '', currentX, y, {
            width: rightEdgeX - currentX - 10,
          });

        y += baseLineSpacing + 3;

        // From M/s - with wrapping
        addFormField('From M/s', payload.fromParty || '', true, true);

        // For M/s - with wrapping
        addFormField('For M/s', payload.forParty || '', true, true);

        // Invoice No
        addFormField('As per Invoice No.', payload.invoiceNumber || '', true, false);

        // Truck No
        addFormField('In Truck No.', payload.truckNumber || '-', true, false);

        y += 15; // Section spacing

        // Accident details section
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Unfortunately, a truck met with an accident near', labelStartX, y);

        const accidentLabelWidth = doc.widthOfString(
          'Unfortunately, a truck met with an accident near',
        );
        const accidentValueX = labelStartX + accidentLabelWidth + valueGap;
        const accidentValueWidth = rightEdgeX - accidentValueX - 15;

        doc.font('Helvetica-Bold');
        const accidentTextHeight = doc.heightOfString(payload.accidentLocation || '', {
          width: accidentValueWidth,
        });
        doc.text(payload.accidentLocation || '', accidentValueX, y, {
          width: accidentValueWidth,
          lineGap: 5,
        });
        y += Math.max(baseLineSpacing, accidentTextHeight + 10);

        // Accident date - date on right side
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('on Date', labelStartX, y);
        
        // Date on right side
        const accidentDateText = payload.accidentDate || '';
        doc.font('Helvetica-Bold');
        const accidentDateWidth = doc.widthOfString(accidentDateText);
        doc.text(accidentDateText, rightEdgeX - accidentDateWidth, y);
        
        y += baseLineSpacing + 3;

        // Vehicle description
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Vehicle', labelStartX, y);

        const vehicleLabelWidth = doc.widthOfString('Vehicle');
        const vehicleValueX = labelStartX + vehicleLabelWidth + valueGap;
        const vehicleValueWidth = rightEdgeX - vehicleValueX - 15;

        doc.font('Helvetica-Bold');
        const vehicleTextHeight = doc.heightOfString(payload.accidentDescription || '', {
          width: vehicleValueWidth,
        });
        doc.text(payload.accidentDescription || '', vehicleValueX, y, {
          width: vehicleValueWidth,
          lineGap: 5,
        });
        y += Math.max(baseLineSpacing, vehicleTextHeight + 10);

        y += 15; // Section spacing

        // Damage amount section
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .fillColor('#000000')
          .text('We agreed the damages as per survey report for Rs.', labelStartX, y);

        const damageLabelWidth = doc.widthOfString(
          'We agreed the damages as per survey report for Rs.',
        );
        const amountNumber =
          typeof payload.agreedDamageAmountNumber === 'number'
            ? payload.agreedDamageAmountNumber
            : undefined;
        doc
          .font('Helvetica-Bold')
          .text(
            amountNumber !== undefined ? amountNumber.toFixed(2) : '________',
            labelStartX + damageLabelWidth + valueGap,
            y,
          );
        y += baseLineSpacing + 3;

        // Amount in words
        if (payload.agreedDamageAmountWords) {
          doc
            .fontSize(fontSize)
            .font('Helvetica')
            .fillColor('#000000')
            .text('Rupees (in words)', labelStartX, y);

          const wordsLabelWidth = doc.widthOfString('Rupees (in words)');
          const wordsValueX = labelStartX + wordsLabelWidth + valueGap;
          const wordsValueWidth = rightEdgeX - wordsValueX - 15;

          doc.font('Helvetica-Bold');
          const wordsTextHeight = doc.heightOfString(payload.agreedDamageAmountWords, {
            width: wordsValueWidth,
          });
          doc.text(payload.agreedDamageAmountWords, wordsValueX, y, {
            width: wordsValueWidth,
            lineGap: 5,
          });
          y += Math.max(baseLineSpacing, wordsTextHeight + 10);
        }

        /* ---------- FOOTER: AUTHORIZED SIGNATORY ---------- */
        const footerY = doc.page.height - margin - 100;
        y = footerY;

        const signName = payload.authorizedSignatoryName || '';

        if (signName) {
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text(signName, margin, y, { width: pageWidth, align: 'right' });
          y += 20;
        }

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#666666')
          .text(
            '(Authorized Signatory - Transporter Agent / Owner)',
            margin,
            y,
            { width: pageWidth, align: 'right' },
          );

        y += 18;

        if (payload.userMobileNumber) {
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#000000')
            .text(
              `Contact: ${payload.userMobileNumber}`,
              margin,
              y,
              { width: pageWidth, align: 'right' },
            );
        }

        doc.end();
      } catch (err: any) {
        reject(
          new BadRequestException(
            `Damage certificate PDF generation failed: ${err?.message || err}`,
          ),
        );
      }
    });
  }
}
