import { MigrationInterface, QueryRunner } from 'typeorm'

export class init1613050217745 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS users (
            id int(11) NOT NULL AUTO_INCREMENT,
            email varchar(255) NOT NULL,
            password varchar(255) NOT NULL,
            isAdmin tinyint(4) NOT NULL DEFAULT 0,
            isActive tinyint(4) NOT NULL DEFAULT 1,
            created datetime(6) NOT NULL DEFAULT current_timestamp(6),
            updated datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            emailConfirmationToken varchar(255) NOT NULL DEFAULT '',
            resetPasswordToken varchar(255) NOT NULL DEFAULT '',
            data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(data)),
            PRIMARY KEY (id),
            UNIQUE KEY IDX_97672ac88f789774dd47f7c8be (email)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
