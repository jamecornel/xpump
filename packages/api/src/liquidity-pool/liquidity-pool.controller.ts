// liquidity-pool.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  ValidationPipe,
  Param,
  BadRequestException,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  AddLiquidityDto,
  LiquidityPoolService,
} from './liquidity-pool.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTokenDto, TokenService } from './token.service';
import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { AMMTradingService, SwapAsset } from './amm-trading.service.';
import { BigNumber } from 'bignumber.js';

export class SwapRequestDTO {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsBoolean()
  @IsNotEmpty()
  isBuy: boolean;

  @IsNumber()
  @IsNotEmpty()
  poolId: number;
}

export class GetTradesQueryDto {
  @IsOptional()
  @IsEnum(['1h', '24h', '7d', '30d'])
  timeframe?: '1h' | '24h' | '7d' | '30d' = '24h';

  @IsOptional()
  @IsNumber()
  limit?: number = 100;
}

export class GetPoolsQueryDto {
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

@Controller('liquidity')
@UseGuards(JwtAuthGuard)
export class LiquidityPoolController {
  constructor(
    private readonly liquidityPoolService: LiquidityPoolService,
    private readonly tokenService: TokenService,
    private readonly tradingService: AMMTradingService,
  ) {}

  @Post('add-liquidity')
  async addLiquidity(
    @Body() addLiquidityDto: Omit<AddLiquidityDto, 'userTelegramId'>,
    @Req() req,
  ) {
    return this.liquidityPoolService.addLiquidity({
      ...addLiquidityDto,
      userId: req.user.id,
    });
  }

  @Post('create-token')
  async createToken(
    @Body() createTokenDto: Omit<CreateTokenDto, 'creatorId'>,
    @Req() req,
  ) {
    return this.tokenService.createToken({
      ...createTokenDto,
      creatorId: req.user.id,
    });
  }

  @Get('pools')
  async getPools(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('order', new DefaultValuePipe('desc')) order?: 'asc' | 'desc',
  ) {
    return this.liquidityPoolService.getPools({ limit, offset, order });
  }

  @Get('pools/:poolId')
  async getPool(@Param('poolId', ParseIntPipe) poolId: number) {
    return this.liquidityPoolService.findById(poolId);
  }

  @Post('trade')
  async executeSwap(
    @Body(new ValidationPipe()) swapRequest: SwapRequestDTO,
    @Req() req,
  ) {
    try {
      const result = await this.tradingService.swap(
        req.user.id,
        swapRequest.poolId,
        swapRequest.amount,
        swapRequest.isBuy,
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('trades/:poolId')
  async getTradeHistory(
    @Param('poolId', ParseIntPipe) poolId: number,
    @Query(ValidationPipe) query: GetTradesQueryDto,
  ) {
    try {
      const trades = await this.tradingService.getTradeHistory(
        poolId,
        query.timeframe,
      );

      // Group and process trades for chart data
      const chartData = trades.map((trade) => ({
        timestamp: trade.timestamp,
        price: trade.price,
        amount: trade.amount,
        side: trade.side,
        total: (parseFloat(trade.price) * parseFloat(trade.amount)).toString(),
      }));

      return {
        trades: chartData.slice(-query.limit),
        stats: this.calculateTradeStats(chartData),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('rate')
  async getExchangeRate(@Body('quoteAsset') quoteAsset: SwapAsset) {
    try {
      const rate = await this.tradingService.getExchangeRate(quoteAsset);
      return rate;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('latest-orders')
  async getLatestOrders(
    @Query('poolId', ParseIntPipe) poolId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    try {
      const orders = await this.tradingService.getLatestOrders(poolId, limit);

      return {
        success: true,
        data: orders.map((order) => ({
          ...order,
          priceImpact: this.calculatePriceImpact(order),
          totalValue: this.calculateTotalValue(order),
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private calculatePriceImpact(order: any): string {
    if (!order.expectedPrice || !order.executedPrice) return '0';

    const expected = new BigNumber(order.expectedPrice);
    const executed = new BigNumber(order.executedPrice);

    return executed
      .minus(expected)
      .dividedBy(expected)
      .multipliedBy(100)
      .toFixed(2);
  }

  private calculateTotalValue(order: any): string {
    const amount = new BigNumber(order.amount);
    const price = new BigNumber(order.price);
    return amount.multipliedBy(price).toString();
  }

  private calculateTradeStats(trades: any[]) {
    if (trades.length === 0) return null;

    const prices = trades.map((t) => parseFloat(t.price));
    const volumes = trades.map((t) => parseFloat(t.amount));

    return {
      high: Math.max(...prices).toString(),
      low: Math.min(...prices).toString(),
      volume24h: volumes.reduce((a, b) => a + b, 0).toString(),
      priceChange24h:
        (((prices[prices.length - 1] - prices[0]) / prices[0]) * 100).toFixed(
          2,
        ) + '%',
      numTrades: trades.length,
    };
  }
}
