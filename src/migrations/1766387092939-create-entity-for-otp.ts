import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEntityForOtp1766387092939 implements MigrationInterface {
    name = 'CreateEntityForOtp1766387092939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "otp_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mobileNumber" character varying(15) NOT NULL, "otpHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91d17e75ac3182dba6701869b39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7f301f8673978e745b630b0e6e" ON "otp_verifications" ("mobileNumber") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_7f301f8673978e745b630b0e6e"`);
        await queryRunner.query(`DROP TABLE "otp_verifications"`);
    }

}
