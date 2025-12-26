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

        const pageWidth = doc.page.width - 80;

        /* ---------- Utility: Card ---------- */
        const drawCard = (
          x: number,
          y: number,
          w: number,
          h: number,
          title?: string,
        ) => {
          doc.roundedRect(x, y, w, h, 6).strokeColor('#CCCCCC').lineWidth(1).stroke();
          if (title) {
            doc.fontSize(11).fillColor('#000').text(title, x + 10, y + 10);
          }
        };

        let y = 40;

        /* ---------- HEADER ---------- */
        doc.fontSize(14).font('Helvetica-Bold')
          .text(`Supplier Name - ${invoiceData.supplierName}`, 40, y);

        doc.roundedRect(40, y + 28, 180, 20, 6)
          .fillOpacity(0.08)
          .fill('#000')
          .fillOpacity(1);

        doc.fontSize(10).fillColor('#000')
          .text(`Place of Supply: ${invoiceData.placeOfSupply}`, 50, y + 32);

        doc.fontSize(16).font('Helvetica-Bold')
          .text('INVOICE', 0, y, { align: 'right' });

        y += 70;

        /* ---------- INVOICE META ---------- */
        const metaY = y;
        const boxHeight = 90;

        drawCard(40, metaY, pageWidth / 2 - 10, boxHeight);

        doc.fontSize(12).font('Helvetica-Bold')
          .text(`Invoice Number : ${invoiceData.invoiceNumber}`, 55, metaY + 20)
          .text(
            `Invoice Date   : ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB')}`,
          )
          .text(`Terms          : ${invoiceData.terms || 'CUSTOM'}`);

        drawCard(40 + pageWidth / 2 + 10, metaY, pageWidth / 2 - 10, boxHeight);

        doc.fontSize(12).font('Helvetica-Bold')
          .text('Supplier Address', 40 + pageWidth / 2 + 25, metaY + 12);

        doc.fontSize(10).font('Helvetica')
          .text(
            Array.isArray(invoiceData.supplierAddress)
              ? invoiceData.supplierAddress.join('\n')
              : String(invoiceData.supplierAddress),
            40 + pageWidth / 2 + 25,
            metaY + 30,
          );

          doc.fontSize(12).font('Helvetica').text(invoiceData.placeOfSupply, 55, y + 32);
          
        y = metaY + boxHeight + 20;

        /* ---------- BILL TO / SHIP TO ---------- */
        const cardHeight = 100;

        drawCard(40, y, pageWidth / 2 - 10, cardHeight);
        doc.fontSize(12).font('Helvetica-Bold').text('Bill To', 55, y + 12);
        doc.fontSize(15).font('Helvetica-Bold').text(invoiceData.billToName, 55, y + 32);
        doc.fontSize(12)
          .text(
            Array.isArray(invoiceData.billToAddress)
              ? invoiceData.billToAddress.join('\n')
              : String(invoiceData.billToAddress),
            55,
            y + 50,
          );
        doc.fontSize(12).font('Helvetica').text(invoiceData.placeOfSupply, 55, y + 32);

        drawCard(40 + pageWidth / 2 + 10, y, pageWidth / 2 - 10, cardHeight);
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Ship To', 40 + pageWidth / 2 + 25, y + 12);
        doc.fontSize(15).font('Helvetica-Bold')
          .text(invoiceData.shipToName, 40 + pageWidth / 2 + 25, y + 32);
        doc.fontSize(12)
          .text(
            Array.isArray(invoiceData.shipToAddress)
              ? invoiceData.shipToAddress.join('\n')
              : String(invoiceData.shipToAddress),
            40 + pageWidth / 2 + 25,
            y + 50,
          );

        y += cardHeight + 25;

        /* ---------- ITEMS TABLE ---------- */
        const tableX = 40;
        const tableY = y;
        const col = [40, 70, 220, 320, 380, 450];

        doc.roundedRect(tableX, tableY, pageWidth, 28, 4)
          .fillOpacity(0.07)
          .fill('#000')
          .fillOpacity(1);

        doc.fontSize(10).font('Helvetica-Bold')
          .text('#', col[0], tableY + 8)
          .text('Item & Description', col[1], tableY + 8)
          .text('HSN/SAC', col[2], tableY + 8)
          .text('Qty', col[3], tableY + 8)
          .text('Rate', col[4], tableY + 8)
          .text('Amount', col[5], tableY + 8);

        const rowHeight = 34;
        doc.rect(tableX, tableY + 28, pageWidth, rowHeight).strokeColor('#D0D0D0').stroke();

        const qty = Number(invoiceData.quantity || 0);
        const rate = Number(invoiceData.rate || 0);
        const amount = Number(invoiceData.amount || 0);

        doc.fontSize(10).font('Helvetica')
          .text('1', col[0], tableY + 38)
          .text(invoiceData.productName, col[1], tableY + 38)
          .text(invoiceData.hsnCode || '-', col[2], tableY + 38)
          .text(qty.toString(), col[3], tableY + 38)
          .text(rate.toFixed(2), col[4], tableY + 38)
          .text(amount.toFixed(2), col[5], tableY + 38);

        y = tableY + 28 + rowHeight + 25;

        /* ---------- NOTES + SUBTOTAL ---------- */
        const leftWidth = pageWidth * 0.62;
        const rightWidth = pageWidth * 0.35;

        drawCard(40, y, leftWidth, 120, 'Notes');

        doc.fontSize(9).font('Helvetica-Bold')
          .text(`VEHICLE NO : ${invoiceData.vehicleNumber || '-'}`, 55, y + 30)
          .text(`Per Nut Rate: ₹${rate.toFixed(2)}`, 55, y + 45)
          .text(
            `This vehicle is transporting ${invoiceData.productName} from Supplier: ${invoiceData.supplierName} to Buyer: ${invoiceData.billToName}.`,
            55,
            y + 65,
            { width: leftWidth - 30 },
          )
          .text(
            `In case of any accident, loss, or damage during transit, Buyer shall be treated as the insured person and will be entitled to receive all claim amounts for the damaged goods.`,
            55,
            y + 85,
            { width: leftWidth - 30 },
          );

        drawCard(40 + leftWidth + 20, y, rightWidth, 80);
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Sub Total', 40 + leftWidth + 35, y + 20);
        doc.fontSize(16)
          .text(amount.toFixed(2), 40 + leftWidth + 35, y + 45);

        y += 140;

        /* ---------- WEIGHMENT SLIP ---------- */
        doc.fontSize(11).font('Helvetica-Bold').text('Weightment Slip', 40, y);
        y += 12;

        drawCard(40, y, leftWidth, 300);

        if (weighmentSlipUrls.length) {
          const resp = await axios.get(weighmentSlipUrls[0], { responseType: 'arraybuffer' });
          const img = await sharp(resp.data)
            .resize(Math.round(leftWidth - 30), 270, { fit: 'inside' })
            .jpeg({ quality: 90 })
            .toBuffer();
          doc.image(img, 55, y + 20, { width: leftWidth - 30 });
        }

        doc.end();
      } catch (err: any) {
        reject(new BadRequestException(`PDF generation failed: ${err?.message || err}`));
      }
    });
  }
}
