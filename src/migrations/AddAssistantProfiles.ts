import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantProfiles1700000001000 implements MigrationInterface {
  name = 'AddAssistantProfiles1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`assistant_profiles\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`bio\` TEXT NULL,
        \`profile_image_url\` VARCHAR(500) NULL,
        \`city\` VARCHAR(100) NULL,
        \`verification_status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`is_available\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX \`IDX_assistant_profiles_user\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_assistant_profiles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`assistant_profile_services\` (
        \`assistant_profile_id\` INT NOT NULL,
        \`service_type_id\` INT NOT NULL,
        PRIMARY KEY (\`assistant_profile_id\`, \`service_type_id\`),
        CONSTRAINT \`FK_aps_profile\` FOREIGN KEY (\`assistant_profile_id\`) REFERENCES \`assistant_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_aps_service\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE INDEX \`IDX_assistant_profiles_verification\` ON \`assistant_profiles\` (\`verification_status\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_assistant_profiles_available\` ON \`assistant_profiles\` (\`is_available\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_assistant_profiles_available\` ON \`assistant_profiles\``);
    await queryRunner.query(`DROP INDEX \`IDX_assistant_profiles_verification\` ON \`assistant_profiles\``);
    await queryRunner.query(`DROP TABLE \`assistant_profile_services\``);
    await queryRunner.query(`DROP TABLE \`assistant_profiles\``);
  }
}
