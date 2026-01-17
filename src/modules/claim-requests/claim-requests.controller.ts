import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { ClaimRequestsService } from './claim-requests.service';
import { CreateClaimByTruckDto } from './dto/create-claim-by-truck.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { FilterClaimRequestsDto } from './dto/filter-claim-requests.dto';
import { ClaimStatus } from '../../common/enums/claim-status.enum';
import { CreateDamageFormDto } from './dto/create-damage-form.dto';

@ApiTags('Claim Requests')
@Controller('claim-requests')
export class ClaimRequestsController {
  constructor(
    private readonly claimRequestsService: ClaimRequestsService,
  ) {}

  @Post('by-truck')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create claim request by truck number',
    description:
      'Finds the latest invoice for the given truck number and creates a claim request with default values (status: PENDING, empty supportedMedia)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        truckNumber: {
          type: 'string',
          example: 'MH12AB1234',
          description: 'Truck number to find latest invoice',
        },
      },
      required: ['truckNumber'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Claim request created successfully with default values',
  })
  @ApiResponse({
    status: 404,
    description: 'Truck or invoice not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Claim request already exists for this invoice',
  })
  @ApiResponse({
    status: 400,
    description: 'Invoice is not marked as a claim invoice',
  })
  createByTruck(@Body() createDto: CreateClaimByTruckDto) {
    return this.claimRequestsService.createClaimByTruckNumber(
      createDto.truckNumber,
    );
  }

  @Get('admin')
  @ApiOperation({
    summary: 'Get all claim requests for admin (with filters)',
    description:
      'Get all claim requests with optional filters by status, invoiceId, or truckNumber',
  })
  @ApiQuery({
    name: 'status',
    enum: ClaimStatus,
    required: false,
    description: 'Filter by claim status',
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    description: 'Filter by invoice ID',
  })
  @ApiQuery({
    name: 'truckNumber',
    required: false,
    description: 'Filter by truck number (partial match)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of claim requests',
  })
  findAllAdmin(@Query() filterDto: FilterClaimRequestsDto) {
    return this.claimRequestsService.findAll(filterDto);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get claim requests by user ID',
    description:
      'Returns all claim requests for a specific user. Users can only see their own claim requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of claim requests for the user',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  findByUserId(@Param('userId') userId: string) {
    return this.claimRequestsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get claim request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Claim request found',
  })
  @ApiResponse({
    status: 404,
    description: 'Claim request not found',
  })
  findOne(@Param('id') id: string) {
    return this.claimRequestsService.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update claim request status',
    description:
      'Update the status of a claim request. When status is SURVEYOR_ASSIGNED, surveyorName and surveyorContact are required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Claim request status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Claim request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status update or missing required fields',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateClaimStatusDto,
  ) {
    return this.claimRequestsService.updateStatus(id, updateDto);
  }

  @Post(':id/supporting-media')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload supporting media files for claim request',
    description:
      'Upload supporting media files (images, documents) to Cloudinary. Files will be appended to existing supportedMedia array.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Supporting media files (up to 10 files, max 10MB each)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Supporting media uploaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Claim request not found',
  })
  @ApiResponse({
    status: 400,
    description: 'No files provided or invalid file',
  })
  async uploadSupportingMedia(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(image\/(jpeg|png|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain)$/i,
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.claimRequestsService.uploadSupportingMedia(id, files);
  }

  @Post(':id/damage-form')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit damage certificate form for a claim request',
    description:
      'Takes damage certificate details and queues a background job to generate a damage certificate PDF and store its URL in claimFormUrl.',
  })
  @ApiResponse({
    status: 202,
    description:
      'Damage form accepted. PDF generation has been queued in the background.',
  })
  @ApiResponse({
    status: 404,
    description: 'Claim request not found',
  })
  async createDamageForm(
    @Param('id') id: string,
    @Body() dto: CreateDamageFormDto,
  ) {
    const claimRequest =
      await this.claimRequestsService.createDamageFormAndQueuePdf(id, dto);

    return {
      message: 'Damage form accepted. PDF generation queued.',
      claimRequestId: claimRequest.id,
    };
  }
}

