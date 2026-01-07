import { IsUUID } from 'class-validator';

import { UpdateInvoiceDto } from './update-invoice.dto';

export class RegenerateInvoiceDto extends UpdateInvoiceDto {
  @IsUUID()
  invoiceId: string;
}


