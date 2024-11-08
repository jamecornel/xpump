// liquidity-pool.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AMMCreate,
  AMMDeposit,
  Client,
  Payment,
  Wallet,
  xrpToDrops,
} from 'xrpl';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import { withAccelerate } from '@prisma/extension-accelerate';
import { GetPoolsQueryDto } from './liquidity-pool.controller';

export interface AddLiquidityDto {
  tokenSymbol: string;
  xrpAmount: string;
  tokenAmount: string;
  userId: number;
}

export interface SwapDto {
  ammAddress: string;
  amount: string;
  userId: number;
  direction: 'buy' | 'sell';
}

@Injectable()
export class LiquidityPoolService {
  private readonly logger = new Logger(LiquidityPoolService.name);
  private client: Client;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new Client(this.configService.get<string>('XRPL_NODE_URL'));
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  async getPools(query: GetPoolsQueryDto) {
    return this.prisma.liquidityPool.findMany({
      include: {
        token: true,
      },
      take: query.limit,
      skip: query.limit * query.offset,
      orderBy: {
        createdAt: query.order,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.$extends(withAccelerate()).liquidityPool.findUnique({
      where: { id },
      include: {
        token: true,
      },
      cacheStrategy: {
        ttl: 60,
        swr: 60,
      },
    });
  }

  async createLiquidityPool(
    signer: Wallet,
    issuerWallet: Wallet,
    tokenSymbol: string,
    xrpBalance: string,
  ) {
    try {
      // Get token details from database
      const token = await this.prisma.token.findUnique({
        where: { symbol: tokenSymbol },
      });

      if (!token) {
        throw new BadRequestException('Token not found');
      }
      const TOKENS_PER_XRP = new BigNumber(1 / token.price.toNumber());
      const userXrpBalance = new BigNumber(xrpBalance).multipliedBy(
        TOKENS_PER_XRP,
      );
      const poolTokenAmount = token.totalSupply.minus(
        userXrpBalance.toNumber(),
      );

      const ss = await this.client.request({ command: 'server_state' });
      const amm_fee_drops =
        ss.result.state.validated_ledger.reserve_inc.toString();
      // Submit AMMCreate transaction
      const ammCreateTx: AMMCreate = {
        TransactionType: 'AMMCreate',
        Account: signer.address,
        Amount: xrpToDrops(Number(xrpBalance)),
        Amount2: {
          currency: token.symbol,
          issuer: issuerWallet.address,
          value: poolTokenAmount.toFixed(0),
        },
        TradingFee: 500,
        Fee: amm_fee_drops,
      };

      const result = await this.client.submit(ammCreateTx, {
        wallet: signer,
        autofill: true,
        failHard: true,
      });
      console.log('result', result);
      if (!result.result.accepted) {
        throw new BadRequestException('Failed to create liquidity pool');
      }

      // Store pool information in database
      const pool = await this.prisma.liquidityPool.create({
        data: {
          tokenId: token.id,
          ammAddress: signer.address,
          xrpReserve: xrpBalance,
          tokenReserve: poolTokenAmount.toString(),
          totalLPTokens: '0',
        },
      });

      return {
        success: true,
        poolId: pool.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create liquidity pool: ${error.stack}`);
      throw new BadRequestException(
        `Liquidity pool creation failed: ${error.message}`,
      );
    }
  }

  async addLiquidity(dto: AddLiquidityDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user || !user.walletAddress) {
        throw new BadRequestException('User wallet not configured');
      }

      const pool = await this.prisma.liquidityPool.findFirst({
        where: {
          token: {
            symbol: dto.tokenSymbol,
          },
        },
        include: {
          token: true,
        },
      });

      if (!pool) {
        throw new BadRequestException('Liquidity pool not found');
      }

      // Submit AMMDeposit transaction
      const ammDepositTx: AMMDeposit = {
        TransactionType: 'AMMDeposit',
        Account: user.walletAddress,
        Asset: {
          currency: 'XRP',
        },
        Asset2: {
          currency: pool.token.symbol,
          issuer: pool.token.issuerAddress,
        },
        Amount: dto.xrpAmount,
        Amount2: {
          currency: pool.token.symbol,
          issuer: pool.token.issuerAddress,
          value: dto.tokenAmount,
        },
      };

      const result = await this.client.submitAndWait(ammDepositTx, {
        wallet: Wallet.fromSeed(user.walletSeed), // You'll need to handle wallet security appropriately
      });

      if ((result.result.meta as any).TransactionResult !== 'tesSUCCESS') {
        throw new Error('Failed to add liquidity');
      }

      // Update pool reserves
      await this.prisma.liquidityPool.update({
        where: { id: pool.id },
        data: {
          xrpReserve: new BigNumber(pool.xrpReserve)
            .plus(dto.xrpAmount)
            .toString(),
          tokenReserve: new BigNumber(pool.tokenReserve)
            .plus(dto.tokenAmount)
            .toString(),
        },
      });

      // Create LP position record
      await this.prisma.liquidityPosition.create({
        data: {
          userId: user.id,
          poolId: pool.id,
          xrpAmount: dto.xrpAmount,
          tokenAmount: dto.tokenAmount,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to add liquidity: ${error.message}`);
      throw new BadRequestException(
        `Adding liquidity failed: ${error.message}`,
      );
    }
  }

  private async createAMMWallet() {
    try {
      const { wallet } = await this.client.fundWallet();
      return wallet;
    } catch (error) {
      this.logger.error('Failed to create AMM wallet:', error);
      throw error;
    }
  }
}
