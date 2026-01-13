import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleCondition } from 'src/entities/vehicle-condition.entity';
import { Truck } from 'src/entities/truck.entity';
import { UpsertVehicleConditionDto } from './dto/upsert-vehicle-condition.dto';
import { normalizeVehicleNumber } from 'src/utils/vehicle-normalizer';

@Injectable()
export class VehicleConditionService {
  constructor(
    @InjectRepository(VehicleCondition)
    private readonly conditionRepo: Repository<VehicleCondition>,

    @InjectRepository(Truck)
    private readonly truckRepo: Repository<Truck>,
  ) {}

  private async isClaimFree(vehicleNumber: string): Promise<boolean> {
    const truck = await this.truckRepo.findOne({
      where: { truckNumber: vehicleNumber },
      select: ['id', 'claimCount'],
    });

    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return truck.claimCount === 0;
  }

  private async calculateVerified(
    dto: UpsertVehicleConditionDto,
  ): Promise<boolean> {
    const noClaims = await this.isClaimFree(dto.vehicleNumber);

    return (
      dto.permitStatus &&
      dto.driverLicense &&
      dto.vehicleCondition &&
      dto.challanClear &&
      dto.emiClear &&
      dto.fitnessClear &&
      noClaims
    );
  }

  async upsert(dto: UpsertVehicleConditionDto) {
    const vehicleNumber = normalizeVehicleNumber(dto.vehicleNumber);

    let record = await this.conditionRepo.findOne({
      where: { vehicleNumber },
    });

    if (!record) {
      record = this.conditionRepo.create({
        ...dto,
        vehicleNumber,
      });
    } else {
      Object.assign(record, dto);
      record.vehicleNumber = vehicleNumber;
    }

    await this.conditionRepo.save(record);
    return record;
  }
  async verifyVehicle(vehicleNumber: string) {
    const normalized = normalizeVehicleNumber(vehicleNumber);

    // 1️⃣ Truck lookup (optional)
    const truck = await this.truckRepo.findOne({
      where: { truckNumber: normalized },
      select: ['claimCount'],
    });

    // 2️⃣ Vehicle condition lookup (mandatory)
    const condition = await this.conditionRepo.findOne({
      where: { vehicleNumber: normalized },
    });

    if (!condition) {
      throw new NotFoundException('Vehicle condition not found');
    }

    // 3️⃣ Vehicle condition check
    const conditionPass =
      condition.permitStatus &&
      condition.driverLicense &&
      condition.vehicleCondition &&
      condition.challanClear &&
      condition.emiClear &&
      condition.fitnessClear;

    // 4️⃣ Auto-claim verification logic
    const hasClaim = truck ? truck.claimCount > 0 : false;

    // 5️⃣ Final verification
    const verified = conditionPass && !hasClaim;

    // 6️⃣ Response
    return {
      vehicleNumber: normalized,

      details: {
        permit: condition.permitStatus ? 'Active' : 'Inactive',
        driverLicense: condition.driverLicense ? 'Available' : 'Not Available',
        vehicleCondition: condition.vehicleCondition ? 'OK' : 'Not OK',
        challan: condition.challanClear ? 'No Challan' : 'Challan Found',
        emi: condition.emiClear ? 'Paid' : 'Due',
        fitness: condition.fitnessClear ? 'Fit' : 'Unfit',
        claim: truck
          ? hasClaim
            ? 'Claim Found'
            : 'No Claim'
          : 'Auto Verified (No Truck Record)',
      },

      verified,

      reason: verified
        ? null
        : hasClaim
          ? 'Truck has previous claim'
          : 'One or more vehicle checks failed',
    };
  }

  async getWhatsappMessage(vehicleNumber: string) {
    const data = await this.verifyVehicle(vehicleNumber);

    const d = data.details;

    return `
Permit – ${d.permit}
परमिट – ${d.permit === 'Active' ? 'एक्टिव' : 'निष्क्रिय'}

Driver License – ${d.driverLicense}
ड्राइवर लाइसेंस – ${d.driverLicense === 'Available' ? 'उपलब्ध' : 'अनुपलब्ध'}

Vehicle Condition – ${d.vehicleCondition}
गाड़ी की स्थिति – ${d.vehicleCondition === 'OK' ? 'ठीक' : 'खराब'}

Challan – ${d.challan}
चालान – ${d.challan === 'No Challan' ? 'कोई चालान नहीं' : 'चालान मौजूद'}

EMI – ${d.emi}
ईएमआई – ${d.emi === 'Paid' ? 'समय पर भुगतान' : 'बकाया'}

Vehicle Fitness – ${d.fitness}
गाड़ी फिटनेस – ${d.fitness === 'Fit' ? 'फिट' : 'अनफिट'}

Claim History – ${d.claim}
क्लेम इतिहास – ${d.claim === 'No Claim' ? 'कोई क्लेम नहीं' : 'क्लेम दर्ज है'}

${data.verified ? '✅' : '❌'} You ${
      data.verified ? 'can take' : 'cannot take'
    } **MandiPlus Verified Vehicle**
${data.verified ? '✅' : '❌'} आप **MandiPlus सत्यापित वाहन**${data.verified ? '' : ' नहीं'} ले सकते हैं
  `.trim();
  }
}
