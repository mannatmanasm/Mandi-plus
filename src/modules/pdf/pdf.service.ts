import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import sharp from 'sharp';

@Injectable()
export class PdfService {
  async generateInvoicePdf(
    invoiceData: any,
    weighmentSlipUrls: string[] = [],
    stampImageUrl?: string,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 80; // 515 points
        let y = 50;

        /* ---------- HEADER ---------- */
        // Supplier Name - left aligned
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(`Supplier Name - ${invoiceData.supplierName}`, 40, y);

        // Place of Supply - below supplier name
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text(`Place of Supply: ${invoiceData.placeOfSupply}`, 40, y + 16);

        // INVOICE - right aligned with dashed border
        const invoiceBoxX = 40 + pageWidth - 100;
        doc
          .roundedRect(invoiceBoxX, y, 100, 35, 3)
          .dash(3, { space: 2 })
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke()
          .undash();

        doc
          .fontSize(17)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('INVOICE', invoiceBoxX + 10, y + 10, {
            width: 80,
            align: 'center',
          });

        y += 50;

        /* ---------- HORIZONTAL LINE ---------- */
        doc
          .moveTo(40, y)
          .lineTo(40 + pageWidth, y)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();

        y += 15;

        /* ---------- TWO COLUMN SECTION WITH BOXES ---------- */
        const leftColX = 40;
        const rightColX = 320;
        const startY = y;
        const boxHeight = 70;

        // LEFT BOX - Invoice Details
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
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(invoiceData.invoiceNumber, leftColX + 105, startY + 12);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Invoice Date', leftColX + 15, startY + 27);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(':', leftColX + 105, startY + 27);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(
            new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB'),
            leftColX + 110,
            startY + 27,
          );

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Terms', leftColX + 15, startY + 42);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(':', leftColX + 105, startY + 42);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(invoiceData.terms || 'CUSTOM', leftColX + 110, startY + 42);

        // RIGHT BOX - Supplier Address
        doc
          .roundedRect(rightColX, startY, 235, boxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Supplier Address', rightColX + 15, startY + 12);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text(
            Array.isArray(invoiceData.supplierAddress)
              ? invoiceData.supplierAddress.join('\n')
              : String(invoiceData.supplierAddress),
            rightColX + 15,
            startY + 25,
            { width: 205, lineGap: 2 },
          );

        y = startY + boxHeight + 15;

        /* ---------- BILL TO / SHIP TO WITH BOXES ---------- */
        const billShipY = y;
        const billShipBoxHeight = 75;

        // Bill To Box - Left
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
          .fillColor('#000000')
          .text(invoiceData.billToName, leftColX + 15, billShipY + 25);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text(
            Array.isArray(invoiceData.billToAddress)
              ? invoiceData.billToAddress.join('\n')
              : String(invoiceData.billToAddress),
            leftColX + 15,
            billShipY + 40,
            { width: 240, lineGap: 2 },
          );

        // Ship To Box - Right
        doc
          .roundedRect(rightColX, billShipY, 235, billShipBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Ship To', rightColX + 15, billShipY + 12);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(invoiceData.shipToName, rightColX + 15, billShipY + 25);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
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
        const tableX = 40;
        const tableY = y;
        const tableWidth = pageWidth;

        // Column positions - adjusted to match PDF exactly
        const cols = {
          hash: tableX + 8,
          item: tableX + 30,
          hsn: tableX + 270,
          qty: tableX + 350,
          rate: tableX + 410,
          amount: tableX + 470,
        };

        // Table header - light gray background
        doc
          .rect(tableX, tableY, tableWidth, 20)
          .fillAndStroke('#F0F0F0', '#000000')
          .lineWidth(0.5);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('#', cols.hash, tableY + 6)
          .text('Item & Description', cols.item, tableY + 6)
          .text('HSN/SAC', cols.hsn, tableY + 6)
          .text('Qty', cols.qty, tableY + 6)
          .text('Rate', cols.rate, tableY + 6)
          .text('Amount', cols.amount, tableY + 6);

        // Table row
        const rowY = tableY + 20;
        doc
          .rect(tableX, rowY, tableWidth, 25)
          .strokeColor('#000000')
          .lineWidth(0.5)
          .stroke();

        const qty = Number(invoiceData.quantity || 0);
        const rate = Number(invoiceData.rate || 0);
        const amount = Number(invoiceData.amount || 0);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#000000')
          .text('1', cols.hash, rowY + 8)
          .text(invoiceData.productName, cols.item, rowY + 8)
          .text(invoiceData.hsnCode || '-', cols.hsn, rowY + 8)
          .text(qty.toString(), cols.qty, rowY + 8)
          .text(rate.toFixed(2), cols.rate, rowY + 8)
          .text(amount.toFixed(2), cols.amount, rowY + 8);

        y = rowY + 25 + 15;

        /* ---------- NOTES WITH BOX ---------- */
        const notesBoxHeight = 125;

        doc
          .roundedRect(40, y, 360, notesBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Notes', 50, y + 10);
        
        // Get the note and make it lowercase for easy checking
        const note = (invoiceData.weighmentSlipNote || '').toLowerCase().trim();

        // Lenient check: Does it contain "cash" or Hindi variations like "nakad", "nakat", "nagad"?
        const isCash =
          note.includes('cash') ||
          note.includes('nak') ||  // Covers nakad, nakat, nakd
          note.includes('nag');    // Covers nagad

        // If Cash -> Buyer Name, Else -> Supplier Name
        const insuredPerson = isCash ? invoiceData.billToName : invoiceData.supplierName;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(`VEHICLE NO : ${invoiceData.vehicleNumber || '-'}`, 50, y + 25);

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(`Per Nut Rate: ₹${rate.toFixed(2)}`, 50, y + 38);

        const notesText1 = `This vehicle is transporting ${invoiceData.productName} from Supplier: ${invoiceData.supplierName} to Buyer: ${invoiceData.billToName}.`;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(notesText1, 50, y + 56, {
            width: 300,
            align: 'left',
            lineGap: 1,
          });

        const notesText2 = `\nIn case of any accident, loss, or damage during transit, ${insuredPerson} shall be treated as the insured person and will be entitled to receive all claim amounts for the damaged goods.`;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text(notesText2, 50, y + 74, {
            width: 300,
            align: 'left',
            lineGap: 2,
          });

        // Sub Total Box on the right
        const subTotalX = 410;
        const subTotalBoxHeight = 60;

        doc
          .roundedRect(subTotalX, y, 145, subTotalBoxHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Sub Total', subTotalX + 10, y + 15);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text(amount.toFixed(2), subTotalX + 10, y + 33);

        y += notesBoxHeight + 25;

        /* ---------- WEIGHMENT SLIP WITH BOX ---------- */
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('Weightment Slip', 40, y);

        y += 5;

        // Authorized Signature on the right
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000000')
          .text('Authorized Signature', 445, y);

        y += 10;

        const slipWidth = 360;
        const slipHeight = 240;

        // Draw box around weighment slip
        doc
          .roundedRect(40, y, slipWidth, slipHeight, 5)
          .strokeColor('#CCCCCC')
          .lineWidth(0.5)
          .stroke();

        if (weighmentSlipUrls && weighmentSlipUrls.length > 0) {
          try {
            const resp = await axios.get(weighmentSlipUrls[0], {
              responseType: 'arraybuffer',
            });
            const img = await sharp(resp.data)
              .resize(slipWidth - 20, slipHeight - 20, { fit: 'inside' })
              .jpeg({ quality: 95 })
              .toBuffer();
            doc.image(img, 50, y + 10, {
              fit: [slipWidth - 20, slipHeight - 20],
            });
          } catch (imgErr) {
            console.error('Failed to load weighment slip image:', imgErr);
          }
        }

        // Optional: Add stamp image on the right side under signature
        if (stampImageUrl) {
          try {
            const stampResp = await axios.get(stampImageUrl, {
              responseType: 'arraybuffer',
            });
            const stampImg = await sharp(stampResp.data)
              .resize(80, 80, { fit: 'inside' })
              .jpeg({ quality: 90 })
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