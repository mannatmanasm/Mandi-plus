import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleCondition } from 'src/entities/vehicle-condition.entity';
import { VehicleConditionController } from './vehicle-condition.controller';
import { VehicleConditionService } from './vehicle-condition.service';
import { TrucksModule } from '../trucks/trucks.module';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleCondition]), TrucksModule],

  controllers: [VehicleConditionController],
  providers: [VehicleConditionService],
  exports: [VehicleConditionService],
})
export class VehicleConditionModule {}
