import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
@Index('idx_system_settings_setting_key', ['settingKey'], { unique: true })
export class SystemSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'setting_key',
    type: 'varchar',
    length: 150,
    unique: true,
  })
  settingKey!: string;

  @Column({
    name: 'setting_value',
    type: 'text',
  })
  settingValue!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
  })
  updatedAt!: Date;
}
