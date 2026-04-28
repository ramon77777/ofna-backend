import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { MissionSelectionMode } from '../../../common/enums/mission-selection-mode.enum';
import { MissionType } from '../../../common/enums/mission-type.enum';
import { PanneType } from '../../../common/enums/panne-type.enum';
import { VehicleType } from '../../../common/enums/vehicle-type.enum';

export class CreateMissionDto {
  @IsEnum(MissionType)
  missionType!: MissionType;

  @IsOptional()
  @IsEnum(PanneType)
  panneType?: PanneType;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsString()
  @Length(1, 5000)
  departureAddress!: string;

  @IsNumberString()
  departureLatitude!: string;

  @IsNumberString()
  departureLongitude!: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  destinationAddress?: string;

  @IsOptional()
  @IsNumberString()
  destinationLatitude?: string;

  @IsOptional()
  @IsNumberString()
  destinationLongitude?: string;

  @IsEnum(MissionSelectionMode)
  selectionMode!: MissionSelectionMode;

  @IsOptional()
  @IsString()
  partnerProfileId?: string;
}