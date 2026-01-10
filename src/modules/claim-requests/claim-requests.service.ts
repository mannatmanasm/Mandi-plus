import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ClaimRequest } from '../../entities/claim-request.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { CreateClaimByTruckDto } from './dto/create-claim-by-truck.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { FilterClaimRequestsDto } from './dto/filter-claim-requests.dto';
import { ClaimStatus } from '../../common/enums/claim-status.enum';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ClaimRequestsService {
  constructor(
    @InjectRepository(ClaimRequest)
    private readonly claimRequestRepository: Repository<ClaimRequest>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Create claim request by truck number - finds latest invoice and creates claim
   * Only truckNumber is required - all other fields use defaults
   */
  async createClaimByTruckNumber(
    truckNumber: string,
  ): Promise<ClaimRequest> {
    // 1. Find truck by truck number
    const truck = await this.truckRepository.findOne({
      where: { truckNumber },
    });

    if (!truck) {
      throw new NotFoundException(
        `Truck with number ${truckNumber} not found`,
      );
    }

    truck.claimCount++;
    await this.truckRepository.save(truck);

    // 2. Find latest invoice for this truck
    const latestInvoice = await this.invoiceRepository.findOne({
      where: { truck: { id: truck.id } },
      relations: ['truck', 'claimRequest'],
      order: { createdAt: 'DESC' },
    });

    if (!latestInvoice) {
      throw new NotFoundException(
        `No invoice found for truck ${truckNumber}`,
      );
    }

    // 3. Check if claim request already exists for this invoice
    if (latestInvoice.claimRequest) {
      throw new ConflictException(
        `Claim request already exists for invoice ${latestInvoice.invoiceNumber}`,
      );
    }

    // 4. Validate invoice has isClaim flag set
    if (!latestInvoice.isClaim) {
      throw new BadRequestException(
        `Invoice ${latestInvoice.invoiceNumber} is not marked as a claim invoice`,
      );
    }

    // 5. Create claim request with defaults
    // Status will be PENDING (default from entity)
    // supportedMedia will be [] (default from entity)
    // All other fields will be null (nullable fields)
    const claimRequest = this.claimRequestRepository.create({
      invoice: latestInvoice,
      // All other fields use defaults from entity
    });

    return await this.claimRequestRepository.save(claimRequest);
  }

  /**
   * Update claim status with additional info (surveyor, notes, etc.)
   */
  async updateStatus(
    claimRequestId: string,
    updateDto: UpdateClaimStatusDto,
  ): Promise<ClaimRequest> {
    const claimRequest = await this.claimRequestRepository.findOne({
      where: { id: claimRequestId },
      relations: ['invoice'],
    });

    if (!claimRequest) {
      throw new NotFoundException(
        `Claim request with ID ${claimRequestId} not found`,
      );
    }

    // Validate surveyor info if status is SURVEYOR_ASSIGNED
    if (
      updateDto.status === ClaimStatus.SURVEYOR_ASSIGNED &&
      (!updateDto.surveyorName || !updateDto.surveyorContact)
    ) {
      throw new BadRequestException(
        'Surveyor name and contact are required when assigning a surveyor',
      );
    }

    // Update status
    claimRequest.status = updateDto.status;

    // Update surveyor info if provided
    if (updateDto.surveyorName) {
      claimRequest.surveyorName = updateDto.surveyorName;
    }
    if (updateDto.surveyorContact) {
      claimRequest.surveyorContact = updateDto.surveyorContact;
    }

    // Update notes if provided
    if (updateDto.notes) {
      claimRequest.notes = updateDto.notes;
    }

    return await this.claimRequestRepository.save(claimRequest);
  }

  /**
   * Upload supporting media files for a claim request
   */
  async uploadSupportingMedia(
    claimRequestId: string,
    files: Express.Multer.File[],
  ): Promise<ClaimRequest> {
    const claimRequest = await this.claimRequestRepository.findOne({
      where: { id: claimRequestId },
      relations: ['invoice'],
    });

    if (!claimRequest) {
      throw new NotFoundException(
        `Claim request with ID ${claimRequestId} not found`,
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Upload files to Cloudinary
    const uploadedUrls = await this.storageService.uploadMultipleFiles(
      files,
      'claim-requests/supporting-media',
    );

    // Append new URLs to existing supportedMedia array
    claimRequest.supportedMedia = [
      ...(claimRequest.supportedMedia || []),
      ...uploadedUrls,
    ];

    return await this.claimRequestRepository.save(claimRequest);
  }

  /**
   * Get all claim requests with optional filters (admin route)
   */
  async findAll(filterDto?: FilterClaimRequestsDto): Promise<ClaimRequest[]> {
    const queryBuilder = this.claimRequestRepository
      .createQueryBuilder('claimRequest')
      .leftJoinAndSelect('claimRequest.invoice', 'invoice')
      .leftJoinAndSelect('invoice.truck', 'truck')
      .leftJoinAndSelect('invoice.user', 'user');

    // Filter by status
    if (filterDto?.status) {
      queryBuilder.andWhere('claimRequest.status = :status', {
        status: filterDto.status,
      });
    }

    // Filter by invoice ID
    if (filterDto?.invoiceId) {
      queryBuilder.andWhere('invoice.id = :invoiceId', {
        invoiceId: filterDto.invoiceId,
      });
    }

    // Filter by truck number
    if (filterDto?.truckNumber) {
      queryBuilder.andWhere('truck.truckNumber ILIKE :truckNumber', {
        truckNumber: `%${filterDto.truckNumber}%`,
      });
    }

    queryBuilder.orderBy('claimRequest.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Get claim request by ID
   */
  async findOne(id: string): Promise<ClaimRequest> {
    const claimRequest = await this.claimRequestRepository.findOne({
      where: { id },
      relations: ['invoice', 'invoice.truck', 'invoice.user'],
    });

    if (!claimRequest) {
      throw new NotFoundException(`Claim request with ID ${id} not found`);
    }

    return claimRequest;
  }

  /**
   * Get claim requests by status
   */
  async findByStatus(status: ClaimStatus): Promise<ClaimRequest[]> {
    return await this.claimRequestRepository.find({
      where: { status },
      relations: ['invoice', 'invoice.truck', 'invoice.user'],
      order: { createdAt: 'DESC' },
    });
  }
}

