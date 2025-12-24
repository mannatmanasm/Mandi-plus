import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1766566877884 implements MigrationInterface {
    name = 'InitSchema1766566877884'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_verifications" DROP COLUMN "otpHash"`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" DROP COLUMN "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "providerSessionId" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "otp_verifications" ALTER COLUMN "providerSessionId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" ADD "expiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "otp_verifications" ADD "otpHash" character varying`);
    }

}
