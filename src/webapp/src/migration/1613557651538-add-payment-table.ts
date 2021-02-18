import { MigrationInterface, QueryRunner } from 'typeorm'

export class addPaymentTable1613557651538 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS payments (
            id int(11) NOT NULL AUTO_INCREMENT,
            account_id int(11) NOT NULL,
            stripe_id varchar(40),
            created datetime(6) NOT NULL DEFAULT current_timestamp(6),
            updated datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            status varchar(40),
            data longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(data)),
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
