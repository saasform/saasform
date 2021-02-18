import { MigrationInterface, QueryRunner } from 'typeorm'

export class addPlanEntity1613553725144 implements MigrationInterface {
  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS plans (
            id int(11) NOT NULL AUTO_INCREMENT,
            created datetime(6) NOT NULL DEFAULT current_timestamp(6),
            updated datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
            product longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(product)),
            prices longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(prices)),
            plan longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(plan)),
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
  }
}
