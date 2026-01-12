import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vehicle_conditions')
export class VehicleCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'vehicle_number', length: 20 })
  vehicleNumber: string;

  @Column({ default: false })
  permitStatus: boolean;

  @Column({ default: false })
  driverLicense: boolean;

  @Column({ default: false })
  vehicleCondition: boolean;

  @Column({ default: false })
  challanClear: boolean;

  @Column({ default: false })
  emiClear: boolean;

  @Column({ default: false })
  fitnessClear: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
