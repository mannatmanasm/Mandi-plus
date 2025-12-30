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
          .text(rate.toFixed(2), cols.rate, rowY + 9)
          .text(amount.toFixed(2), cols.amount, rowY + 9, {
            width: 100,
            align: 'left',
            lineBreak: false,
          });

        y = rowY + rowHeight + 15;

        /* ---------- NOTES ---------- */
        const notesBoxHeight = 110; // Reduced from 125 to 110
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
          `VEHICLE NO : ${invoiceData.vehicleNumber || '-'}`,
          margin + 10,
          y + 25,
        );
        doc.text(`Per Nut Rate: Rs.${rate.toFixed(2)}`, margin + 10, y + 38);

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
          .text('Sub Total', subTotalX + 10, y + 15);
        doc.fontSize(12).text(amount.toFixed(2), subTotalX + 10, y + 33);

        y += notesBoxHeight + 15; // Reduced spacing from 25 to 15

        /* ---------- WEIGHMENT SLIP & TERMS AND CONDITIONS (Halves) ---------- */

        const GAP = 15;
        const COL_WIDTH = (pageWidth - GAP) / 2;

        const LEFT_COL_X = margin;
        const RIGHT_COL_X = margin + COL_WIDTH + GAP;

        const SECTION_HEIGHT = 260; // Increased from 200 to 260

        // --- 1. WEIGHMENT SLIP (Left Half) ---
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

        // --- 2. TERMS AND CONDITIONS (Right Half) ---
        const textX = RIGHT_COL_X + 8;
        let textY = boxStartY + 8;
        const textWidth = COL_WIDTH - 16;

        doc.fontSize(7.8).fillColor('#000000');

        // 1. Scope of Claim Eligibility (BOLD)
        doc
          .font('Helvetica-Bold')
          .text('1.Scope of Claim Eligibility : ', textX, textY, {
            width: textWidth,
          });

        textY = doc.y;

        // normal text
        doc
          .font('Helvetica')
          .text(
            '• Vehicle accident, collision, or overturning during transit.\n' +
              '• Theft, hijacking, or unlawful removal of the cargo.\n' +
              '• Shortage or Missing Goods: Claims are admissible only when the difference between loading and unloading weighment slips exceeds 2 Tons.\n' +
              '• Loss due to looting, strikes, riots, protests, or civil commotion.\n' +
              '• Damage caused by adverse weather conditions or natural calamities (Act of God).\n' +
              '• Fire, explosion, or related perils.\n' +
              '• Loss caused due to driver fraud, negligence, or wilful misconduct.\n',
            textX,
            textY,
            { width: textWidth, lineGap: 1 },
          );

        textY = doc.y;

        // 2. Mandatory Documentation for Claim Processing (BOLD)
        doc
          .font('Helvetica-Bold')
          .text(
            '2. Mandatory Documentation for Claim Processing : ',
            textX,
            textY,
            { width: textWidth },
          );

        textY = doc.y;

        doc
          .font('Helvetica')
          .text(
            '• Photographs or videos of the damaged goods or incident.\n' +
              '• Copy of the FIR and original Invoice.\n' +
              '• Damage Certificate and Letter of Subrogation issued by the transporter.\n' +
              '• Valid Insurance Certificate and Proof of Delivery (POD) issued at unloading.\n',
            textX,
            textY,
            { width: textWidth, lineGap: 1 },
          );

        textY = doc.y;

        // 3. Dispute Resolution & Communication (BOLD)
        doc
          .font('Helvetica-Bold')
          .text('3. Dispute Resolution & Communication : ', textX, textY, {
            width: textWidth,
          });

        textY = doc.y;

        doc
          .font('Helvetica')
          .text(
            'All claim-related communication must be made via email at onerootoffice@oneroot.farm.',
            textX,
            textY,
            { width: textWidth, lineGap: 1 },
          );

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
}
