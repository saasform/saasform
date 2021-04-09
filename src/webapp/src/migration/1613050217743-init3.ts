import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1613050217743 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS accounts_users (
            id int(11) NOT NULL AUTO_INCREMENT,
            account_id int(11) NOT NULL,
            user_id int(11) NOT NULL,
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
