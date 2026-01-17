import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Identity } from '../common/enums/user.enum';
import { IndiaState } from '../common/enums/india-state.enum';
import { Invoice } from './invoice.entity';

@Entity('users')
@Index(['mobileNumber'], { unique: true })
@Index(['secondaryMobileNumber'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===============================
  // AUTH / BASIC PROFILE
  // ===============================

  @Column({ length: 15 })
  mobileNumber: string;

  @Column({
    type: 'varchar',
    length: 15,
    nullable: true,
    transformer: {
      to: (value: string | null) => {
        if (!value || value.trim() === '') return null;
        return value;
      },
      from: (value: string | null) => value,
    },
  })
  secondaryMobileNumber: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: IndiaState,
  })
  state: IndiaState;

  @Column({
    type: 'enum',
    enum: Identity,
    nullable: true,
  })
  identity: Identity | null;

  // ===============================
  // PRODUCT (COMMON FIELD)
  // Meaning depends on identity
  // ===============================

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  products: string[] | null;

  // ===============================
  // SUPPLIER
  // ===============================

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  loadingPoint: string[] | null;

  // ===============================
  // BUYER
  // ===============================

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  destinationShopAddress: string[] | null;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  route: string[] | null;

  // ===============================
  // TRANSPORTER
  // ===============================

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  officeAddress: string[] | null;

  // ===============================
  // AGENT
  // ===============================

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  destinationAddress: string[] | null;

  // ===============================
  // RELATIONS
  // ===============================

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];

  // ===============================
  // CONSENT
  // ===============================

  @Column({ default: false })
  isConsent: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  consentText: string | null;

  // ===============================
  // SYSTEM
  // ===============================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
