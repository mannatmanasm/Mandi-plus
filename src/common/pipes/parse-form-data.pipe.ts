import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseFormDataPipe implements PipeTransform {
  transform(value: any) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const parsed = { ...value };

    // Parse array fields that might come as JSON strings or comma-separated strings
    const arrayFields = [
      'supplierAddress',
      'billToAddress',
      'shipToAddress',
      'productName',
      'officeAddress',
      'route',
      'loadingPoint',
      'destinationShopAddress',
      'destinationAddress',
    ];

    arrayFields.forEach((field) => {
      if (parsed[field]) {
        if (typeof parsed[field] === 'string') {
          try {
            // Try parsing as JSON first
            parsed[field] = JSON.parse(parsed[field]);
          } catch {
            // If not JSON, treat as comma-separated or single value
            parsed[field] = parsed[field].split(',').map((s: string) => s.trim());
          }
        }
      }
    });

    // Parse number fields
    const numberFields = ['quantity', 'rate', 'amount'];
    numberFields.forEach((field) => {
      if (parsed[field] !== undefined && parsed[field] !== null && parsed[field] !== '') {
        const num = Number(parsed[field]);
        if (!isNaN(num)) {
          parsed[field] = num;
        }
      }
    });

    // Parse boolean fields
    if (parsed.isClaim !== undefined && parsed.isClaim !== null && parsed.isClaim !== '') {
      parsed.isClaim = parsed.isClaim === 'true' || parsed.isClaim === true;
    }

    return parsed;
  }
}

