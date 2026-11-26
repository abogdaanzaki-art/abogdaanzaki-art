import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoriteAssistants1700000002000 implements MigrationInterface {
  name = 'AddFavoriteAssistants1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`favorite_assistants\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`customer_id\` INT NOT NULL,
        \`assistant_id\` INT NOT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX \`UQ_customer_assistant\` (\`customer_id\`, \`assistant_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_fav_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_fav_assistant\` FOREIGN KEY (\`assistant_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_favorites_customer\` ON \`favorite_assistants\` (\`customer_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_favorites_assistant\` ON \`favorite_assistants\` (\`assistant_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_favorites_assistant\` ON \`favorite_assistants\``);
    await queryRunner.query(`DROP INDEX \`IDX_favorites_customer\` ON \`favorite_assistants\``);
    await queryRunner.query(`DROP TABLE \`favorite_assistants\``);
  }
}
