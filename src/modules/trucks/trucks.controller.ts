import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@ApiTags('Trucks')
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new truck' })
  @ApiResponse({ status: 201, description: 'Truck created successfully' })
  @ApiResponse({ status: 409, description: 'Truck with this number already exists' })
  create(@Body() createTruckDto: CreateTruckDto) {
    return this.trucksService.create(createTruckDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trucks' })
  @ApiResponse({ status: 200, description: 'List of all trucks' })
  findAll() {
    return this.trucksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a truck by ID' })
  @ApiResponse({ status: 200, description: 'Truck found' })
  @ApiResponse({ status: 404, description: 'Truck not found' })
  findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a truck' })
  @ApiResponse({ status: 200, description: 'Truck updated successfully' })
  @ApiResponse({ status: 404, description: 'Truck not found' })
  @ApiResponse({ status: 409, description: 'Truck number conflict' })
  update(@Param('id') id: string, @Body() updateTruckDto: UpdateTruckDto) {
    return this.trucksService.update(id, updateTruckDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a truck' })
  @ApiResponse({ status: 204, description: 'Truck deleted successfully' })
  @ApiResponse({ status: 404, description: 'Truck not found' })
  remove(@Param('id') id: string) {
    return this.trucksService.remove(id);
  }
}

