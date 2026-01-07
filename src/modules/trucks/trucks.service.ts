import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from '../../entities/truck.entity';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@Injectable()
export class TrucksService {
  constructor(
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
  ) {}

  async create(createTruckDto: CreateTruckDto): Promise<Truck> {
    // Check if truck number already exists
    const existingTruck = await this.truckRepository.findOne({
      where: { truckNumber: createTruckDto.truckNumber },
    });

    if (existingTruck) {
      throw new ConflictException('Truck with this number already exists');
    }

    const truck = this.truckRepository.create(createTruckDto);
    return await this.truckRepository.save(truck);
  }

  async findAll(): Promise<Truck[]> {
    return await this.truckRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['invoices'],
    });
  }

  async findOne(id: string): Promise<Truck> {
    const truck = await this.truckRepository.findOne({
      where: { id },
      relations: ['invoices'],
    });

    if (!truck) {
      throw new NotFoundException(`Truck with ID ${id} not found`);
    }

    return truck;
  }

  async findByTruckNumber(truckNumber: string): Promise<Truck | null> {
    return await this.truckRepository.findOne({
      where: { truckNumber },
    });
  }

  async update(id: string, updateTruckDto: UpdateTruckDto): Promise<Truck> {
    const truck = await this.findOne(id);

    // Check if truck number is being updated and conflicts with existing truck
    if (
      updateTruckDto.truckNumber &&
      updateTruckDto.truckNumber !== truck.truckNumber
    ) {
      const existingTruck = await this.truckRepository.findOne({
        where: { truckNumber: updateTruckDto.truckNumber },
      });

      if (existingTruck) {
        throw new ConflictException('Truck with this number already exists');
      }
    }

    Object.assign(truck, updateTruckDto);
    return await this.truckRepository.save(truck);
  }

  async remove(id: string): Promise<void> {
    const truck = await this.findOne(id);
    await this.truckRepository.remove(truck);
  }

  async incrementClaimCount(id: string): Promise<Truck> {
    const truck = await this.findOne(id);
    truck.claimCount += 1;
    return await this.truckRepository.save(truck);
  }
}
