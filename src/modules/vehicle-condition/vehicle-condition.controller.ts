import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VehicleConditionService } from './vehicle-condition.service';
import { UpsertVehicleConditionDto } from './dto/upsert-vehicle-condition.dto';

@ApiTags('Vehicle Condition')
@Controller('vehicle-condition')
export class VehicleConditionController {
  constructor(private readonly service: VehicleConditionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or update vehicle condition',
    description:
      'Creates or updates a vehicle condition and auto-calculates verification status',
  })
  @ApiBody({ type: UpsertVehicleConditionDto })
  @ApiResponse({ status: 200, description: 'Vehicle condition saved' })
  upsert(@Body() dto: UpsertVehicleConditionDto) {
    return this.service.upsert(dto);
  }

  @Get(':vehicleNumber/verify')
  @ApiOperation({
    summary: 'Get vehicle verification status',
    description: 'Returns human readable verification details',
  })
  @ApiParam({
    name: 'vehicleNumber',
    example: 'UP32GH4589',
  })
  @ApiResponse({ status: 200, description: 'Vehicle condition fetched' })
  verify(@Param('vehicleNumber') vehicleNumber: string) {
    return this.service.verifyVehicle(vehicleNumber);
  }

  @Get(':vehicleNumber/whatsapp')
  @ApiOperation({
    summary: 'Get WhatsApp formatted verification message',
    description: 'Returns formatted bilingual text for WhatsApp or SMS bots',
  })
  @ApiParam({
    name: 'vehicleNumber',
    example: 'UP32GH4589',
  })
  @ApiResponse({ status: 200, description: 'WhatsApp message generated' })
  getWhatsapp(@Param('vehicleNumber') vehicleNumber: string) {
    return this.service.getWhatsappMessage(vehicleNumber);
  }
}
