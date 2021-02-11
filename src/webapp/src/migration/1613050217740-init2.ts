import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1613050217740 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS settings (
            id int(11) NOT NULL AUTO_INCREMENT,
            category varchar(255) NOT NULL,
            json longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(json)),
            created datetime(6) NOT NULL DEFAULT current_timestamp(6),
            updated datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            PRIMARY KEY (id)
          ) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
