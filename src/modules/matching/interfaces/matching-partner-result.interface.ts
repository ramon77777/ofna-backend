import { PartnerProfileEntity } from '../../partners/entities/partner-profile.entity';

export interface MatchingPartnerResult {
  partnerProfile: PartnerProfileEntity;
  distanceKm: number;
}