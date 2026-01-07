import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TruckTrackerService, TruckLocationResponse } from './truck-tracker.service';

@ApiTags('Truck Tracker')
@Controller('trucks/track')
export class TruckTrackerController {
  constructor(private readonly truckTrackerService: TruckTrackerService) {}

  @Get(':vehicleNumber')
  @ApiOperation({
    summary: 'Get live truck location by vehicle number',
    description: 'Fetches latest location/status from Firebase Realtime Database',
  })
  @ApiResponse({
    status: 200,
    description: 'Truck location fetched successfully',
    type: Object,
  })
  async getTruckLocation(
    @Param('vehicleNumber') vehicleNumber: string,
  ): Promise<TruckLocationResponse> {
    return this.truckTrackerService.getTruckLocation(vehicleNumber);
  }
}

