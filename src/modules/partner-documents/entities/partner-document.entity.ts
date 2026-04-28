import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PartnerDocumentStatus } from '../../../common/enums/partner-document-status.enum';
import { PartnerDocumentType } from '../../../common/enums/partner-document-type.enum';
import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('partner_documents')
@Index('idx_partner_documents_document_type', ['documentType'])
@Index('idx_partner_documents_document_status', ['documentStatus'])
export class PartnerDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(
    () => PartnerProfileEntity,
    (partnerProfile) => partnerProfile.documents,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: PartnerProfileEntity;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: PartnerDocumentType,
  })
  documentType!: PartnerDocumentType;

  @Column({
    name: 'file_url',
    type: 'text',
  })
  fileUrl!: string;

  @Column({
    name: 'document_status',
    type: 'enum',
    enum: PartnerDocumentStatus,
    default: PartnerDocumentStatus.SOUMIS,
  })
  documentStatus!: PartnerDocumentStatus;

  @Column({
    name: 'admin_comment',
    type: 'text',
    nullable: true,
  })
  adminComment!: string | null;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    default: () => 'NOW()',
  })
  submittedAt!: Date;

  @Column({
    name: 'verified_at',
    type: 'timestamp',
    nullable: true,
  })
  verifiedAt!: Date | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'verified_by_admin_id' })
  verifiedByAdmin!: UserEntity | null;

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