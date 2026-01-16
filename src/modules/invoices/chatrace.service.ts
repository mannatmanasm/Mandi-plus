import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatraceService {
  private readonly logger = new Logger(ChatraceService.name);

  private readonly CHATRACE_API_KEY = process.env.CHATRACE_API_KEY;
  private readonly INVOICE_FLOW_ID = Number(process.env.CHATRACE_FLOW_ID);

  async sendInvoiceVerifiedFlow(data: {
    phone: string;
    supplierName: string;
    invoiceNumber: string;
    pdfUrl: string;
  }) {
    this.logger.log('🔥 Invoice Chatrace Flow START');
    this.logger.log(`Payload: ${JSON.stringify(data)}`);

    const raw = data.phone.trim();

    // Same as your working code - add +91 prefix
    const sanitized = raw.startsWith('+91') ? raw : `+91${raw}`;

    const payload = {
      phone: sanitized,
      first_name: data.supplierName || 'Customer',
      last_name: '',
      gender: 'male',
      actions: [
        {
          action: 'set_field_value',
          field_name: 'supplier_name',
          value: data.supplierName?.trim() || 'Customer',
        },
        {
          action: 'set_field_value',
          field_name: 'invoice_number',
          value: data.invoiceNumber?.trim() || 'INV-000',
        },
        {
          action: 'set_field_value',
          field_name: 'invoice_pdf',
          value: data.pdfUrl?.trim() || '',
        },
        {
          action: 'send_flow',
          flow_id: this.INVOICE_FLOW_ID,
        },
      ],
    };

    console.log('🔥 FINAL PAYLOAD TO CHATRACE');
    console.log(JSON.stringify(payload, null, 2));

    try {
      const resp = await axios.post('https://api.chatrace.com/users', payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-ACCESS-TOKEN': this.CHATRACE_API_KEY,
        },
      });

      this.logger.log(
        `✅ Invoice WhatsApp SENT | Invoice=${data.invoiceNumber}`,
      );
      return resp.data;
    } catch (error: any) {
      this.logger.error('❌ Invoice Chatrace FAILED');
      this.logger.error(JSON.stringify(error.response?.data || error.message));
      throw error;
    }
  }
}
