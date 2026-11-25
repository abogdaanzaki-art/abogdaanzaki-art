import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMashwariSchema1700000000000 implements MigrationInterface {
  name = 'CreateMashwariSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`roles\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(50) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        UNIQUE INDEX \`IDX_roles_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`full_name\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(200) NOT NULL,
        \`phone\` VARCHAR(50) NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`user_roles\` (
        \`user_id\` INT NOT NULL,
        \`role_id\` INT NOT NULL,
        \`assigned_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`user_id\`, \`role_id\`),
        CONSTRAINT \`FK_user_roles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_user_roles_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`service_types\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(50) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`base_price\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX \`IDX_service_types_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`addresses\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`address_line\` VARCHAR(255) NOT NULL,
        \`city\` VARCHAR(100) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_addresses_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`promotions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(150) NOT NULL,
        \`type\` VARCHAR(30) NOT NULL,
        \`min_services\` INT NOT NULL DEFAULT 2,
        \`discount_value\` DECIMAL(10,2) NOT NULL DEFAULT 10,
        \`starts_at\` DATETIME NULL,
        \`ends_at\` DATETIME NULL,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`promotion_services\` (
        \`promotion_id\` INT NOT NULL,
        \`service_type_id\` INT NOT NULL,
        \`special_price\` DECIMAL(10,2) NOT NULL,
        PRIMARY KEY (\`promotion_id\`, \`service_type_id\`),
        CONSTRAINT \`FK_promo_services_promo\` FOREIGN KEY (\`promotion_id\`) REFERENCES \`promotions\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_promo_services_service\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`orders\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`customer_id\` INT NOT NULL,
        \`address_id\` INT NOT NULL,
        \`promotion_id\` INT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`discount_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`total_price\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`address_snapshot\` TEXT NULL,
        \`scheduled_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_orders_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_orders_address\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE CASCADE,
        CONSTRAINT \`FK_orders_promotion\` FOREIGN KEY (\`promotion_id\`) REFERENCES \`promotions\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`order_items\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`order_id\` INT NOT NULL,
        \`service_type_id\` INT NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`unit_price\` DECIMAL(10,2) NOT NULL,
        \`subtotal\` DECIMAL(10,2) NOT NULL,
        \`discount_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`total\` DECIMAL(10,2) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`started_at\` DATETIME NULL,
        \`completed_at\` DATETIME NULL,
        \`details\` TEXT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_order_items_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_order_items_service\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`order_item_assignments\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`order_item_id\` INT NOT NULL,
        \`assistant_id\` INT NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'OFFERED',
        \`offered_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`responded_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_assignments_item\` FOREIGN KEY (\`order_item_id\`) REFERENCES \`order_items\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_assignments_assistant\` FOREIGN KEY (\`assistant_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`payments\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`order_id\` INT NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`method\` VARCHAR(10) NOT NULL DEFAULT 'CASH',
        \`status\` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
        \`transaction_ref\` VARCHAR(150) NULL,
        \`paid_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_payments_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`reviews\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`order_id\` INT NOT NULL,
        \`customer_id\` INT NOT NULL,
        \`assistant_id\` INT NOT NULL,
        \`rating\` INT NOT NULL,
        \`comment\` TEXT NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX \`UQ_order_assistant\` (\`order_id\`, \`assistant_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_reviews_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_reviews_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_reviews_assistant\` FOREIGN KEY (\`assistant_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    // Indexes for common lookups
    await queryRunner.query(`CREATE INDEX \`IDX_orders_customer\` ON \`orders\` (\`customer_id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_orders_status\` ON \`orders\` (\`status\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_order_items_order\` ON \`order_items\` (\`order_id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_assignments_assistant\` ON \`order_item_assignments\` (\`assistant_id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_assignments_item\` ON \`order_item_assignments\` (\`order_item_id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_payments_order\` ON \`payments\` (\`order_id\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_reviews_assistant\` ON \`reviews\` (\`assistant_id\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_reviews_assistant\` ON \`reviews\``);
    await queryRunner.query(`DROP INDEX \`IDX_payments_order\` ON \`payments\``);
    await queryRunner.query(`DROP INDEX \`IDX_assignments_item\` ON \`order_item_assignments\``);
    await queryRunner.query(`DROP INDEX \`IDX_assignments_assistant\` ON \`order_item_assignments\``);
    await queryRunner.query(`DROP INDEX \`IDX_order_items_order\` ON \`order_items\``);
    await queryRunner.query(`DROP INDEX \`IDX_orders_status\` ON \`orders\``);
    await queryRunner.query(`DROP INDEX \`IDX_orders_customer\` ON \`orders\``);
    await queryRunner.query(`DROP TABLE \`reviews\``);
    await queryRunner.query(`DROP TABLE \`payments\``);
    await queryRunner.query(`DROP TABLE \`order_item_assignments\``);
    await queryRunner.query(`DROP TABLE \`order_items\``);
    await queryRunner.query(`DROP TABLE \`orders\``);
    await queryRunner.query(`DROP TABLE \`promotion_services\``);
    await queryRunner.query(`DROP TABLE \`promotions\``);
    await queryRunner.query(`DROP TABLE \`addresses\``);
    await queryRunner.query(`DROP TABLE \`service_types\``);
    await queryRunner.query(`DROP TABLE \`user_roles\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`roles\``);
  }
}
