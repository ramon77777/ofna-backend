import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

import { MissionStatus } from '../../../common/enums/mission-status.enum';

export class UpdateMissionStatusDto {
  @IsEnum(MissionStatus)
  missionStatus!: MissionStatus;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  comment?: string;
}