import { WalletRechargeEntity } from '../../wallet-recharges/entities/wallet-recharge.entity';
import { WalletEntity } from '../entities/wallet.entity';

export interface WalletSummary {
  wallet: WalletEntity;
  totalRecharges: number;
  successfulRechargesCount: number;
  latestRecharge: WalletRechargeEntity | null;
}