import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { ClaimStatus } from 'src/common/enums/claim-status.enum';

@Entity('claim_requests')
export class ClaimRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===============================
  // INVOICE RELATION (One-to-One)
  // ===============================

  @OneToOne(() => Invoice, (invoice) => invoice.claimRequest, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  // ===============================
  // CLAIM DETAILS
  // ===============================

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    nullable: false,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  @Column({
    type: 'text',
    array: true,
    nullable: false,
    default: [],
  })
  supportedMedia: string[];

  @Column({
    type: 'text',
    nullable: true,
  })
  claimFormUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  claimAmount: number | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  surveyorName: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  surveyorContact: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  // ===============================
  // SYSTEM
  // ===============================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

