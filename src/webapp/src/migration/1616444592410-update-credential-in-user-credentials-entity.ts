import {MigrationInterface, QueryRunner} from "typeorm";

export class updateCredentialInUserCredentialsEntity1616444592410 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // adding default value
        await queryRunner.query(`
            ALTER TABLE users_credentials
            MODIFY credential VARCHAR(255) DEFAULT 'username/password';
        `);
        // removing unique constraint
        await queryRunner.query(`
            ALTER TABLE users_credentials
            DROP INDEX IDX_2eadaf29b2fd55a4705975397f;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
