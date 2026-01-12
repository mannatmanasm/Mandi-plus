import { IsNotEmpty, IsString } from 'class-validator';

export class VehicleNumberDto {
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;
}
