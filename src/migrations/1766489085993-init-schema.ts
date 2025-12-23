import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1766489085993 implements MigrationInterface {
    name = 'InitSchema1766489085993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_state_enum" AS ENUM('ANDHRA_PRADESH', 'ARUNACHAL_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL', 'DELHI')`);
        await queryRunner.query(`CREATE TYPE "public"."users_identity_enum" AS ENUM('TRANSPORTER', 'SUPPLIER', 'BUYER', 'AGENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mobileNumber" character varying(15) NOT NULL, "secondaryMobileNumber" character varying(15), "name" character varying(255) NOT NULL, "state" "public"."users_state_enum" NOT NULL, "identity" "public"."users_identity_enum", "products" text array, "loadingPoint" text array, "destinationShopAddress" text array, "route" text array, "officeAddress" text array, "destinationAddress" text array, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_840d0f3f0736288a0efdffd0f4" ON "users" ("secondaryMobileNumber") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_61dc14c8c49c187f5d08047c98" ON "users" ("mobileNumber") `);
        await queryRunner.query(`CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "refreshTokenHash" character varying, "deviceInfo" character varying NOT NULL, "ipAddress" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoiceNumber" character varying NOT NULL, "invoiceDate" date NOT NULL, "terms" character varying(255), "supplierName" character varying NOT NULL, "supplierAddress" text array NOT NULL, "placeOfSupply" character varying NOT NULL, "billToName" character varying NOT NULL, "billToAddress" text array NOT NULL, "shipToName" character varying NOT NULL, "shipToAddress" text array NOT NULL, "productName" character varying(255) NOT NULL, "hsnCode" character varying(255), "quantity" numeric(10,2) NOT NULL, "rate" numeric(10,2) NOT NULL, "amount" numeric(12,2) NOT NULL, "vehicleNumber" character varying(255), "weighmentSlipNote" text, "weighmentSlipUrls" text array, "isClaim" boolean NOT NULL DEFAULT false, "claimDetails" text, "pdfUrl" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "truckId" uuid, CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON "invoices" ("invoiceNumber") `);
        await queryRunner.query(`CREATE TABLE "trucks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "truckNumber" character varying(20) NOT NULL, "ownerName" character varying NOT NULL, "ownerContactNumber" character varying(15) NOT NULL, "driverName" character varying NOT NULL, "driverContactNumber" character varying(15) NOT NULL, "claimCount" integer NOT NULL DEFAULT '0', "officeAddress" text array, "route" text array, "permit" character varying(255), "licence" character varying(255), "challan" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a134fb7caa4fb476d8a6e035f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f9424e55f03c06cdc225bc25cb" ON "trucks" ("truckNumber") `);
        await queryRunner.query(`CREATE TABLE "otp_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mobileNumber" character varying(15) NOT NULL, "otpHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isUsed" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91d17e75ac3182dba6701869b39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7f301f8673978e745b630b0e6e" ON "otp_verifications" ("mobileNumber") `);
        await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_55fa4db8406ed66bc7044328427" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_a1a06f2a3337c61af44f9d3e3ae" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_a1a06f2a3337c61af44f9d3e3ae"`);
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_55fa4db8406ed66bc7044328427"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f301f8673978e745b630b0e6e"`);
        await queryRunner.query(`DROP TABLE "otp_verifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9424e55f03c06cdc225bc25cb"`);
        await queryRunner.query(`DROP TABLE "trucks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bf8e0f9dd4558ef209ec111782"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_61dc14c8c49c187f5d08047c98"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_840d0f3f0736288a0efdffd0f4"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_identity_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_state_enum"`);
    }

}
