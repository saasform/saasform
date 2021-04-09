import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1613050217744 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS users_credentials (
            id int(11) NOT NULL AUTO_INCREMENT,
            credential varchar(255) NOT NULL,
            userId int(11) NOT NULL,
            json longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(json)),
            PRIMARY KEY (id),
            UNIQUE KEY IDX_2eadaf29b2fd55a4705975397f (credential)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
