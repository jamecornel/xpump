import { Module } from '@nestjs/common';
import { LiquidityPoolService } from './liquidity-pool.service';
import { LiquidityPoolController } from './liquidity-pool.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenService } from './token.service';
import { AMMTradingService } from './amm-trading.service.';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [LiquidityPoolController],
  providers: [LiquidityPoolService, TokenService, AMMTradingService],
})
export class LiquidityPoolModule {}
