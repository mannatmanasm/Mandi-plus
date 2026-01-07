import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TrucksService } from './trucks.service';
import { TrucksController } from './trucks.controller';
import { Truck } from '../../entities/truck.entity';
import { TruckTrackerService } from './truck-tracker.service';
import { TruckTrackerController } from './truck-tracker.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Truck]), ConfigModule],
  controllers: [TrucksController, TruckTrackerController],
  providers: [TrucksService, TruckTrackerService],
  exports: [TrucksService, TruckTrackerService],
})
export class TrucksModule {}

