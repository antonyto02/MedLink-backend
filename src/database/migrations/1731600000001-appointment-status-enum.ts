import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentStatusEnum1731600000001 implements MigrationInterface {
  name = 'AppointmentStatusEnum1731600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status_enum') THEN
          CREATE TYPE "appointment_status_enum" AS ENUM ('programada', 'completada', 'no_asistio');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "appointments"
      ALTER COLUMN "status"
      TYPE "appointment_status_enum"
      USING "status"::"appointment_status_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ALTER COLUMN "status"
      TYPE varchar
      USING "status"::text
    `);
    await queryRunner.query('DROP TYPE IF EXISTS "appointment_status_enum"');
  }
}
