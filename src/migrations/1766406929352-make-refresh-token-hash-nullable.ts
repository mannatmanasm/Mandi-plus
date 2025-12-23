import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeRefreshTokenHashNullable1766406929352 implements MigrationInterface {
    name = 'MakeRefreshTokenHashNullable1766406929352'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_sessions" ALTER COLUMN "refreshTokenHash" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_sessions" ALTER COLUMN "refreshTokenHash" SET NOT NULL`);
    }

}
