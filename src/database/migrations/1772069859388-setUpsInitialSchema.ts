import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetUpsInitialSchema1772069859388 implements MigrationInterface {
  name = 'SetUpsInitialSchema1772069859388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "keyHash" character varying(64) NOT NULL, "keyPrefix" character varying(12) NOT NULL, "name" character varying(100), "webhookSecret" character varying(64), "isActive" boolean NOT NULL DEFAULT true, "lastUsedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_df3b25181df0b4b59bd93f16e10" UNIQUE ("keyHash"), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_userId" ON "api_keys" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_api_keys_keyHash_isActive_deletedAt" ON "api_keys" ("keyHash", "isActive", "deletedAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."jobs_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'queued', "imageUrl" character varying(2048) NOT NULL, "webhookUrl" character varying(2048) NOT NULL, "options" jsonb, "resultUrl" character varying(2048), "errorCode" character varying(50), "errorMessage" character varying(500), "completedAt" TIMESTAMP, "failedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jobs_userId_status" ON "jobs" ("userId", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_plan_enum" AS ENUM('basic', 'pro')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "plan" "public"."users_plan_enum" NOT NULL DEFAULT 'basic', "credits" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "idempotencyKey" character varying(255) NOT NULL, "requestHash" character varying(64) NOT NULL, "responseStatusCode" integer NOT NULL, "responseBody" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_idempotency_keys_expiresAt" ON "idempotency_keys" ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c78ab6d6c8e069972e1f4e4ad7" ON "idempotency_keys" ("userId", "idempotencyKey") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_6c2e267ae764a9413b863a29342" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_79ae682707059d5f7655db4212a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "idempotency_keys" ADD CONSTRAINT "FK_7a3aaa526470ebb79221693d325" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "idempotency_keys" DROP CONSTRAINT "FK_7a3aaa526470ebb79221693d325"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP CONSTRAINT "FK_79ae682707059d5f7655db4212a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_6c2e267ae764a9413b863a29342"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c78ab6d6c8e069972e1f4e4ad7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_idempotency_keys_expiresAt"`,
    );
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_plan_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_userId_status"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "public"."jobs_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_api_keys_keyHash_isActive_deletedAt"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_userId"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
  }
}
