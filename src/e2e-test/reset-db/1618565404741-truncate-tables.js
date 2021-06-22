const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class truncateTables1618565404741 {

    async up(queryRunner) {
        await queryRunner.query(`TRUNCATE accounts`)
        await queryRunner.query(`TRUNCATE accounts_domains`)
        await queryRunner.query(`TRUNCATE accounts_users`)
        await queryRunner.query(`TRUNCATE payments`)
        await queryRunner.query(`TRUNCATE plans`)
        // await queryRunner.query(`TRUNCATE settings`)  - do NOT truncate, otherwise public key will change
        await queryRunner.query(`TRUNCATE users`)
        await queryRunner.query(`TRUNCATE users_credentials`)
    }

    async down(queryRunner) {
    }

}
