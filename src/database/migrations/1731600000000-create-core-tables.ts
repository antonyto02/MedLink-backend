import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreTables1731600000000 implements MigrationInterface {
  name = 'CreateCoreTables1731600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "role" varchar NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "doctor_schedule" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "doctor_id" uuid NOT NULL,
        "date" date NOT NULL,
        "time" time NOT NULL,
        "available" boolean DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_doctor_schedule_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_doctor_schedule_doctor_date_time" ON "doctor_schedule" ("doctor_id", "date", "time")',
    );

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "schedule_id" uuid NOT NULL,
        "status" varchar NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_appointments_patient_id" FOREIGN KEY ("patient_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_appointments_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_appointments_schedule_id" FOREIGN KEY ("schedule_id") REFERENCES "doctor_schedule"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vital_signs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "bpm" integer NOT NULL,
        "spo2" integer NOT NULL,
        "pressure_sys" integer NOT NULL,
        "pressure_dia" integer NOT NULL,
        "recorded_at" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_vital_signs_patient_id" FOREIGN KEY ("patient_id") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "vital_signs"');
    await queryRunner.query('DROP TABLE "appointments"');
    await queryRunner.query('DROP INDEX "IDX_doctor_schedule_doctor_date_time"');
    await queryRunner.query('DROP TABLE "doctor_schedule"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
