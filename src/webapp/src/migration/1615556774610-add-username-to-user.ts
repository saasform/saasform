import { MigrationInterface, QueryRunner } from 'typeorm'

export class addUsernameToUser1615556774610 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE users
        ADD username VARCHAR(255) UNIQUE
        AFTER email
    `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
