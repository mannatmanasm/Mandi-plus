import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IndiaState } from 'src/common/enums/india-state.enum';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid Indian mobile number',
  })
  mobileNumber: string;

  @IsEnum(IndiaState, {
    message: 'Invalid Indian state',
  })
  state: IndiaState;
}
