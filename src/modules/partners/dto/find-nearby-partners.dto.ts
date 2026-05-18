import { IsEnum, IsNumberString } from 'class-validator';

import { MissionType } from '../../../common/enums/mission-type.enum';

export class FindNearbyPartnersDto {
  @IsEnum(MissionType)
  missionType!: MissionType;

  @IsNumberString()
  latitude!: string;

  @IsNumberString()
  longitude!: string;
}
