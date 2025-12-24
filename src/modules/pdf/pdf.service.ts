import { Injectable, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import sharp from 'sharp';

@Injectable()
export class PdfService {
  async generateInvoicePdf(
    invoiceData: any,
    weighmentSlipUrls: string[] = [],
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .text('INVOICE', { align: 'center' })
          .moveDown();

        // Invoice Number and Date
        doc
          .fontSize(12)
          .text(`Invoice Number: ${invoiceData.invoiceNumber}`, { align: 'left' })
          .text(`Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`, { align: 'left' })
          .moveDown();

        // Supplier Details
        doc
          .fontSize(14)
          .text('From:', { underline: true })
          .fontSize(12)
          .text(invoiceData.supplierName);
        invoiceData.supplierAddress.forEach((line: string) => {
          doc.text(line);
        });
        doc.text(`Place of Supply: ${invoiceData.placeOfSupply}`);
        doc.moveDown();

        // Bill To
        doc
          .fontSize(14)
          .text('Bill To:', { underline: true })
          .fontSize(12)
          .text(invoiceData.billToName);
        invoiceData.billToAddress.forEach((line: string) => {
          doc.text(line);
        });
        doc.moveDown();

        // Ship To
        doc
          .fontSize(14)
          .text('Ship To:', { underline: true })
          .fontSize(12)
          .text(invoiceData.shipToName);
        invoiceData.shipToAddress.forEach((line: string) => {
          doc.text(line);
        });
        doc.moveDown();

        // Terms
        if (invoiceData.terms) {
          doc.fontSize(12).text(`Terms: ${invoiceData.terms}`).moveDown();
        }

        // Vehicle Details
        if (invoiceData.vehicleNumber || invoiceData.truck?.truckNumber) {
          doc.fontSize(12).text('Vehicle Details:', { underline: true });
          if (invoiceData.truck?.truckNumber) {
            doc.text(`Truck Number: ${invoiceData.truck.truckNumber}`);
          }
          if (invoiceData.vehicleNumber) {
            doc.text(`Vehicle Number: ${invoiceData.vehicleNumber}`);
          }
          doc.moveDown();
        }

        // Items Table Header
        const tableTop = doc.y;
        doc
          .fontSize(10)
          .text('Product', 50, tableTop)
          .text('HSN', 200, tableTop)
          .text('Qty', 280, tableTop)
          .text('Rate', 320, tableTop, { align: 'right' })
          .text('Amount', 400, tableTop, { align: 'right' })
          .moveDown();

        // Item Row - handle productName which might be JSON string or array
        let products: string[];
        if (typeof invoiceData.productName === 'string') {
          try {
            products = JSON.parse(invoiceData.productName);
          } catch {
            products = [invoiceData.productName];
          }
        } else if (Array.isArray(invoiceData.productName)) {
          products = invoiceData.productName;
        } else {
          products = [String(invoiceData.productName)];
        }
        const productName = products.join(', ');

        // Ensure values are Numbers before calling .toFixed()
        const qty = Number(invoiceData.quantity || 0);
        const rate = Number(invoiceData.rate || 0);
        const amount = Number(invoiceData.amount || 0);

        doc
          .text(productName, 50)
          .text(invoiceData.hsnCode || '-', 200)
          .text(qty.toString(), 280) // Use safe variable
          .text(rate.toFixed(2), 320, undefined, { align: 'right' }) // Use safe variable
          .text(amount.toFixed(2), 400, undefined, { align: 'right' }) // Use safe variable
          .moveDown();

        // Total (Update this part too)
        doc
          .fontSize(12)
          .text(`Total: ₹${amount.toFixed(2)}`, 350, doc.y, { align: 'right' })
          .moveDown(2);

        // Weighment Slip Note
        if (invoiceData.weighmentSlipNote) {
          doc
            .fontSize(12)
            .text('Weighment Slip Note:', { underline: true })
            .fontSize(10)
            .text(invoiceData.weighmentSlipNote)
            .moveDown();
        }

        // Weighment Slip Images
        if (weighmentSlipUrls && weighmentSlipUrls.length > 0) {
          doc
            .fontSize(12)
            .text('Weighment Slips:', { underline: true })
            .moveDown();

          let yPosition = doc.y;
          const imageWidth = 200;
          const imageHeight = 150;
          const imagesPerRow = 2;
          const spacing = 20;

          for (let i = 0; i < weighmentSlipUrls.length; i++) {
            try {
              // Download image
              const response = await axios.get(weighmentSlipUrls[i], {
                responseType: 'arraybuffer',
              });
              const imageBuffer = Buffer.from(response.data);

              // Convert to JPEG if needed and resize
              const processedImage = await sharp(imageBuffer)
                .resize(imageWidth, imageHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .jpeg({ quality: 85 })
                .toBuffer();

              // Calculate position
              const col = i % imagesPerRow;
              const row = Math.floor(i / imagesPerRow);
              const x = 50 + col * (imageWidth + spacing);
              yPosition = tableTop + 50 + row * (imageHeight + spacing);

              // Check if we need a new page
              if (yPosition + imageHeight > doc.page.height - 50) {
                doc.addPage();
                yPosition = 50;
              }

              // Add image to PDF
              doc.image(processedImage, x, yPosition, {
                width: imageWidth,
                height: imageHeight,
              });
            } catch (error) {
              console.error(`Error processing image ${i + 1}:`, error);
              // Continue with next image if one fails
            }
          }

          doc.y = yPosition + imageHeight + spacing;
        }

        // Claim Details
        if (invoiceData.isClaim && invoiceData.claimDetails) {
          doc
            .fontSize(12)
            .text('Claim Details:', { underline: true })
            .fontSize(10)
            .text(invoiceData.claimDetails)
            .moveDown();
        }

        // Footer
        doc
          .fontSize(8)
          .text(
            `Generated on ${new Date().toLocaleString()}`,
            50,
            doc.page.height - 50,
            { align: 'center' },
          );

        doc.end();
      } catch (error) {
        reject(new BadRequestException(`PDF generation failed: ${error.message}`));
      }
    });
  }
}

