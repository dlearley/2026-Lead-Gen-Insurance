import { Module } from '@nestjs/common';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';
import {
  MarketAnalysisEngine,
  EcosystemPartnershipManager,
  AgencyNetworkManager,
  NetworkEffectsEngine
} from '@leadgen/strategy';

@Module({
  controllers: [StrategyController],
  providers: [
    StrategyService,
    MarketAnalysisEngine,
    EcosystemPartnershipManager,
    AgencyNetworkManager,
    NetworkEffectsEngine
  ],
  exports: [StrategyService]
})
export class StrategyModule {}