import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1760000000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        token_hash text NOT NULL,
        expires_at timestamp NOT NULL,
        used_at timestamp NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT fk_password_reset_tokens_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
      ON password_reset_tokens(token_hash)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON password_reset_tokens(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_password_reset_tokens_token_hash
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_password_reset_tokens_user_id
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS password_reset_tokens
    `);
  }
}
