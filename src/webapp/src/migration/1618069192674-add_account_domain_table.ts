import { MigrationInterface, QueryRunner } from 'typeorm'

export class addAccountDomainTable1618069192674 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS accounts_domains (
            id int(11) NOT NULL AUTO_INCREMENT,
            created datetime(6) NOT NULL DEFAULT current_timestamp(6),
            updated datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            domain varchar(255) UNIQUE NOT NULL,
            data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(data)),
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DROP TABLE accounts_domains
    `)
  }
}
