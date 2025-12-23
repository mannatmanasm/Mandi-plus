import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfUrlToInvoice1766250000000 implements MigrationInterface {
  name = 'AddPdfUrlToInvoice1766250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "pdfUrl" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "pdfUrl"`);
  }
}

