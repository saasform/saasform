import {MigrationInterface, QueryRunner} from "typeorm";

export class truncateTables1618565404741 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`TRUNCATE accounts`)
        await queryRunner.query(`TRUNCATE accounts_users`)
        await queryRunner.query(`TRUNCATE accounts_domains`)
        await queryRunner.query(`TRUNCATE users`)
        await queryRunner.query(`TRUNCATE users_credentials`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
