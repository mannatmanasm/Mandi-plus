import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private useCloudinary: boolean;

  constructor(private configService: ConfigService) {
    this.useCloudinary =
      this.configService.get<string>('STORAGE_TYPE', 'cloudinary') ===
      'cloudinary';

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
        api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'invoices',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (this.useCloudinary) {
      return this.uploadToCloudinary(file, folder);
    } else {
      return this.uploadToR2(file, folder);
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'invoices',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async uploadMultipleFilesObj(
    files: Express.Multer.File[] | Record<string, Express.Multer.File>,
    folder: string = 'invoices',
  ): Promise<string[]> {
    if (!files) {
      throw new BadRequestException('No files provided');
    }

    // 🔥 normalize object → array
    const fileArray: Express.Multer.File[] = Array.isArray(files)
      ? files
      : Object.values(files);

    if (fileArray.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = fileArray.map((file) =>
      this.uploadFile(file, folder),
    );

    return Promise.all(uploadPromises);
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mandi-plus/${folder}`,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(
              new BadRequestException('Upload failed: No result returned'),
            );
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  private async uploadToR2(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    // R2 implementation would go here if needed
    // For now, using Cloudinary as default
    throw new BadRequestException(
      'R2 storage not yet implemented. Please use Cloudinary.',
    );
  }

  async uploadPdf(
    pdfBuffer: Buffer,
    filename: string,
    folder: string = 'invoice-pdfs',
  ): Promise<string> {
    if (this.useCloudinary) {
      return this.uploadPdfToCloudinary(pdfBuffer, filename, folder);
    } else {
      return this.uploadPdfToR2(pdfBuffer, filename, folder);
    }
  }

  private async uploadPdfToCloudinary(
    pdfBuffer: Buffer,
    filename: string,
    folder: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mandi-plus/${folder}`,
          resource_type: 'raw',
          filename_override: filename,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(
              new BadRequestException(`PDF upload failed: ${error.message}`),
            );
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(
              new BadRequestException('PDF upload failed: No result returned'),
            );
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(pdfBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  private async uploadPdfToR2(
    pdfBuffer: Buffer,
    filename: string,
    folder: string,
  ): Promise<string> {
    // R2 implementation would go here if needed
    throw new BadRequestException(
      'R2 storage not yet implemented. Please use Cloudinary.',
    );
  }
}
