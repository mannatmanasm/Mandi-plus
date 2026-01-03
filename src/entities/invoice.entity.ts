import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Truck } from './truck.entity';
import { User } from './user.entity';

@Entity('invoices')
@Index(['invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===============================
  // INVOICE CORE
  // ===============================

  @Column()
  invoiceNumber: string;

  @Column({ type: 'date' })
  invoiceDate: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  terms: string | null;

  // ===============================
  // SUPPLIER DETAILS
  // ===============================

  @Column()
  supplierName: string;

  @Column({
    type: 'text',
    array: true,
  })
  supplierAddress: string[];

  @Column()
  placeOfSupply: string;

  // ===============================
  // BUYER DETAILS
  // ===============================

  @Column()
  billToName: string;

  @Column({
    type: 'text',
    array: true,
  })
  billToAddress: string[];

  @Column()
  shipToName: string;

  @Column({
    type: 'text',
    array: true,
  })
  shipToAddress: string[];

  // ===============================
  // ITEM DETAILS
  // ===============================

  @Column({
    type: 'varchar',
    length: 255,
  })
  productName: string[];

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  hsnCode: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  rate: number;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  // ===============================
  // USER RELATION
  // ===============================

  @ManyToOne(() => User, (user) => user.invoices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  user: User;

  // ===============================
  // TRANSPORT / VEHICLE
  // ===============================

  @ManyToOne(() => Truck, (truck) => truck.invoices, {
    onDelete: 'SET NULL',
  })
  truck: Truck;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  ownerName: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  vehicleNumber: string | null;

  // ===============================
  // WEIGHBRIDGE DETAILS
  // ===============================

  @Column({
    type: 'text',
    nullable: true,
  })
  weighmentSlipNote: string | null;
  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  weighmentSlipUrls: string[] | null;

  // ===============================
  // INSURANCE / CLAIM NOTE
  // ===============================

  @Column({ default: false })
  isClaim: boolean;

  @Column({ type: 'text', nullable: true })
  claimDetails: string | null;

  // ===============================
  // PDF DOCUMENT
  // ===============================

  @Column({ type: 'text', nullable: true })
  pdfUrl: string | null;

  // ===============================
  // SYSTEM
  // ===============================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
