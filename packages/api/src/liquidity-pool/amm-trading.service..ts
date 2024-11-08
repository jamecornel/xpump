import { Injectable, Logger } from '@nestjs/common';
import {
  Client,
  IssuedCurrencyAmount,
  OfferCreate,
  Wallet,
  xrpToDrops,
} from 'xrpl';
import BigNumber from 'bignumber.js';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { LiquidityPoolService } from './liquidity-pool.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SwapAsset {
  currency: string;
  issuer: string;
}

export interface SwapResult {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
  txHash: string;
}

@Injectable()
export class AMMTradingService {
  private readonly logger = new Logger(AMMTradingService.name);
  private client: Client;
  private readonly SLIPPAGE_MULTIPLIER = 1.01; // 1% slippage tolerance

  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private liquidityPoolService: LiquidityPoolService,
    private prismaService: PrismaService,
  ) {
    this.client = new Client(this.configService.get<string>('XRPL_NODE_URL'));
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to XRPL');
    } catch (error) {
      this.logger.error('Failed to connect to XRPL', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Disconnected from XRPL');
    }
  }

  /**
   * Calculate the trading fee multiplier
   * @param tradingFee - Fee in basis points (0-1000, where 1000 = 1%)
   */
  private calculateFeeMultiplier(tradingFee: number): BigNumber {
    return new BigNumber(1).minus(new BigNumber(tradingFee).dividedBy(100000));
  }

  /**
   * Calculate required input amount for desired output using AMM formula
   */
  private calculateSwapOut(
    assetInAmount: BigNumber,
    poolInAmount: BigNumber,
    poolOutAmount: BigNumber,
    tradingFee: number,
  ): BigNumber {
    const feeMultiplier = this.calculateFeeMultiplier(tradingFee);
    // Calculate token out based on asset in using constant product formula
    // (x + dx)(y - dy) = xy where dx is asset in and dy is asset out
    // Apply fee by reducing the effective input amount
    const effectiveInput = assetInAmount.multipliedBy(feeMultiplier);
    return effectiveInput
      .multipliedBy(poolOutAmount)
      .dividedBy(poolInAmount.plus(effectiveInput));
  }

  /**
   * Swap XRP for another token or vice versa
   */
  async swap(
    userId: number,
    poolId: number,
    amount: number,
    isBuy: boolean, // true = buying token with XRP, false = selling token for XRP
  ): Promise<SwapResult> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const wallet = Wallet.fromSeed(user.walletSeed);

    const pool = await this.liquidityPoolService.findById(poolId);
    if (!pool) {
      throw new Error('Liquidity pool not found');
    }

    const fromAsset = isBuy
      ? { currency: 'XRP', issuer: null }
      : {
          currency: pool.token.symbol,
          issuer: pool.token.issuerAddress,
        };
    const toAsset = isBuy
      ? { currency: pool.token.symbol, issuer: pool.token.issuerAddress }
      : { currency: 'XRP', issuer: null };

    try {
      // Get AMM info for the trading pair
      const ammInfo = await this.client.request({
        command: 'amm_info',
        asset: { currency: 'XRP', issuer: null },
        asset2: {
          currency: pool.token.symbol,
          issuer: pool.token.issuerAddress,
        },
      });

      const amm = (ammInfo.result as any).amm;

      // Extract pool information
      const poolXrp = new BigNumber(amm.amount);
      const poolToken = new BigNumber(amm.amount2.value);
      const tradingFee = amm.trading_fee;

      // Calculate swap amounts
      const targetAmount = new BigNumber(amount);
      let xrpAmount: BigNumber;
      let tokenAmount: BigNumber;

      if (isBuy) {
        // Buying token with XRP
        xrpAmount = targetAmount;
        tokenAmount = this.calculateSwapOut(
          xrpAmount,
          poolXrp,
          poolToken,
          tradingFee,
        );
        tokenAmount = tokenAmount
          .multipliedBy(this.SLIPPAGE_MULTIPLIER)
          .dp(0, BigNumber.ROUND_CEIL);
      } else {
        // Selling token for XRP
        tokenAmount = targetAmount;
        xrpAmount = this.calculateSwapOut(
          tokenAmount,
          poolToken,
          poolXrp,
          tradingFee,
        );
        xrpAmount = xrpAmount
          .multipliedBy(this.SLIPPAGE_MULTIPLIER)
          .dp(3, BigNumber.ROUND_FLOOR);

        console.log('xrpAmount', xrpAmount.toNumber());
        console.log('tokenAmount', tokenAmount.toNumber());
      }
      const order = await this.prismaService.order.create({
        data: {
          userId: userId,
          poolId: poolId,
          side: isBuy ? 'BUY' : 'SELL',
          amount: amount.toString(),
          price: '0',
          status: 'PENDING',
        },
      });
      // Prepare and submit the offer
      const offerCreate: OfferCreate = {
        TransactionType: 'OfferCreate',
        Account: wallet.address,
        TakerPays: isBuy
          ? {
              currency: toAsset.currency,
              issuer: toAsset.issuer,
              value: tokenAmount.toString(),
            }
          : xrpToDrops(xrpAmount),
        TakerGets: isBuy
          ? xrpToDrops(xrpAmount)
          : {
              currency: fromAsset.currency,
              issuer: fromAsset.issuer,
              value: tokenAmount.toString(),
            },
      };

      const { result } = await this.client.submit(offerCreate, {
        autofill: true,
        wallet: wallet,
      });
      if (!result.accepted) {
        throw new Error('Swap failed');
      }
      console.log('result', result.tx_json.hash);
      const executedPrice = isBuy
        ? new BigNumber(tokenAmount).dividedBy(amount)
        : new BigNumber(xrpAmount);

      // Update order record
      await this.prismaService.order.update({
        where: { id: order.id },
        data: {
          status: 'FILLED',
          price: executedPrice.toString(),
          filledAmount: amount.toString(),
          txHash: result.tx_json.hash,
        },
      });
      // Calculate and update market cap
      const priceInXrp = poolXrp.dividedBy(poolToken);
      const marketCap = priceInXrp.multipliedBy(0.55);
      await this.prismaService.liquidityPool.update({
        where: { id: poolId },
        data: {
          marketCap: marketCap.toString(),
        },
      });
      // Record trade history
      await this.prismaService.tradeHistory.create({
        data: {
          poolId: poolId,
          price: executedPrice.toString(),
          amount: amount.toString(),
          side: isBuy ? 'BUY' : 'SELL',
          txHash: result.tx_json.hash,
          userId: user.id,
        },
      });

      return {
        success: result.accepted,
        message: 'Swap successful',
        txHash: result.tx_json.hash,
      };
    } catch (error) {
      this.logger.error('Swap failed', error);
      return {
        success: false,
        message: error.message,
        error: error,
        txHash: '',
      };
    }
  }

  /**
   * Get current exchange rate for a trading pair
   */
  async getExchangeRate(
    quoteAsset: SwapAsset,
  ): Promise<{ rate: string; poolLiquidity: any }> {
    try {
      const ammInfo = await this.client.request({
        command: 'amm_info',
        asset: {
          currency: 'XRP',
          issuer: null,
        },
        asset2: quoteAsset,
      });

      const amm = ammInfo.result.amm;
      const baseAmount = new BigNumber(amm.amount.toString());
      const quoteAmount = new BigNumber((amm.amount2 as any).value);

      return {
        rate: quoteAmount.dividedBy(baseAmount).toString(),
        poolLiquidity: {
          baseAsset: baseAmount.toString(),
          quoteAsset: quoteAmount.toString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get exchange rate', error);
      throw error;
    }
  }

  async getTradeHistory(
    poolId: number,
    timeframe: string = '1d',
  ): Promise<any[]> {
    const startTime = this.getStartTimeForTimeframe(timeframe);

    return this.prismaService.tradeHistory.findMany({
      where: {
        poolId: poolId,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  async getLatestOrders(poolId: number, limit: number = 10) {
    try {
      const tradeHistory = await this.prismaService.tradeHistory.findMany({
        where: {
          poolId: poolId,
        },
        take: limit,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
          pool: {
            select: {
              token: {
                select: {
                  symbol: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      console.log(tradeHistory);
      return tradeHistory;
      // return tradeHistory.map((trade) => ({
      //   id: trade.id,
      //   side: trade.side,
      //   amount: trade.amount,
      //   price: trade.price,
      //   timestamp: trade.timestamp,
      //   username: trade.user.username || 'Anonymous',
      //   tokenSymbol: trade.pool.token.symbol,
      //   tokenName: trade.pool.token.name,
      //   txHash: trade.txHash,
      // }));
    } catch (error) {
      this.logger.error('Failed to fetch latest orders:', error);
      throw new Error('Failed to fetch latest orders');
    }
  }

  private getStartTimeForTimeframe(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
