import {MigrationInterface, QueryRunner} from "typeorm";

export class addEmailToUserCredentialsEntity1616418580476 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE users_credentials
            ADD email VARCHAR(255) NOT NULL
            AFTER credential
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
