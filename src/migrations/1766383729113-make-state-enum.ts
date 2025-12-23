import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeStateEnum1766383729113 implements MigrationInterface {
    name = 'MakeStateEnum1766383729113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "state"`);
        await queryRunner.query(`CREATE TYPE "public"."users_state_enum" AS ENUM('ANDHRA_PRADESH', 'ARUNACHAL_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL', 'DELHI')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "state" "public"."users_state_enum" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "state"`);
        await queryRunner.query(`DROP TYPE "public"."users_state_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "state" character varying(255) NOT NULL`);
    }

}
