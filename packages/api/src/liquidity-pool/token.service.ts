// token.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccountSet,
  AccountSetAsfFlags,
  Client,
  Payment,
  TrustSet,
  Wallet,
  convertStringToHex,
} from 'xrpl';
import { ConfigService } from '@nestjs/config';
import { LiquidityPoolService } from './liquidity-pool.service';

export interface CreateTokenDto {
  name: string;
  symbol: string;
  totalSupply: string;
  description?: string;
  telegramChat?: string;
  telegramChannel?: string;
  website?: string;
  twitter?: string;
  creatorId: number;
  xrpBalance?: string;
  logo?: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private client: Client;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private liquidityPoolService: LiquidityPoolService,
  ) {
    // Initialize XRPL client
    this.client = new Client(this.configService.get<string>('XRPL_NODE_URL'));
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  async createToken(dto: CreateTokenDto) {
    try {
      if (!dto.xrpBalance || Number(dto.xrpBalance) < 10) {
        throw new BadRequestException('XRP balance must be greater than 10');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: dto.creatorId },
      });

      if (!user || !user.walletAddress) {
        throw new BadRequestException('User wallet not configured');
      }

      const existingToken = await this.prisma.token.findUnique({
        where: { symbol: dto.symbol },
      });

      if (existingToken) {
        throw new BadRequestException('Token already exists');
      }

      // 2. Generate wallet for token issuer
      this.logger.debug('Generate wallet for token issuer');
      const issuerWallet = await this.createIssuerWallet();

      // 3. Set up token on XRPL
      const currencyCode = this.formatCurrencyCode(dto.symbol);
      console.log('currencyCode', currencyCode);
      this.logger.debug('Setup token on XRPL');

      const signer = Wallet.fromSeed(user.walletSeed);
      await this.setupTokenOnXRPL(signer, issuerWallet, currencyCode);

      // 4. Store token information in database
      this.logger.debug('Store token information in database');
      const token = await this.prisma.token.create({
        data: {
          name: dto.name,
          symbol: currencyCode,
          totalSupply: dto.totalSupply,
          description: dto.description,
          telegramChat: dto.telegramChat,
          telegramChannel: dto.telegramChannel,
          issuerAddress: issuerWallet.address,
          website: dto.website,
          twitter: dto.twitter,
          creatorId: user.id,
          price: 0.0000015,
        },
      });

      // // 5. Create initial portfolio entry for creator
      // this.logger.debug('Create initial portfolio entry for creator');
      // await this.prisma.portfolio.create({
      //   data: {
      //     userId: user.id,
      //     tokenId: token.id,
      //     amount: dto.totalSupply,
      //   },
      // });

      // // 6. Create deploy transaction record
      // this.logger.debug('Create deploy transaction record');
      // await this.prisma.transaction.create({
      //   data: {
      //     type: 'DEPLOY',
      //     amount: 0,
      //     tokenAmount: dto.totalSupply,
      //     price: 0,
      //     tokenId: token.id,
      //     userId: user.id,
      //   },
      // });

      // // 7. Create liquidity pool
      this.logger.debug('Create liquidity pool');
      await this.liquidityPoolService.createLiquidityPool(
        signer,
        issuerWallet,
        currencyCode,
        dto.xrpBalance,
      );

      return {
        issuerAddress: issuerWallet.address,
        currencyCode,
        success: true,
        message: 'Token created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create token: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Token creation failed: ${error.message}`);
    }
  }

  private async createIssuerWallet() {
    try {
      this.logger.debug('Create new wallet for token issuer');
      // Generate new wallet for token issuer
      const { wallet: issuerWallet } = await this.client.fundWallet();
      // Set DefaultRipple on issuer account
      const defaultRippleTx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: issuerWallet.address,
        SetFlag: AccountSetAsfFlags.asfDefaultRipple,
      };

      await this.client.submit(defaultRippleTx, {
        wallet: issuerWallet,
        autofill: true,
        failHard: true,
      });

      return issuerWallet;
    } catch (error) {
      this.logger.error('Failed to create issuer wallet:', error);
      throw error;
    }
  }

  private async setupTokenOnXRPL(
    signer: Wallet,
    issuerWallet: Wallet,
    currencyCode: string,
  ) {
    try {
      // 1. Create trust line from user to issuer
      this.logger.debug('Create trust line from user to issuer');
      const trustSetTx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: signer.address,
        LimitAmount: {
          currency: currencyCode,
          issuer: issuerWallet.address,
          value: '1000000000',
        },
      };

      await this.client.submit(trustSetTx, {
        wallet: signer,
        autofill: true,
        failHard: true,
      });
      // trustSetResult;
      // if (
      //   (trustSetResult.result.meta as any).TransactionResult !== 'tesSUCCESS'
      // ) {
      //   throw new Error('Failed to create trust line');
      // }

      // 2. Issue token to user
      this.logger.debug('Issue token to user');
      const paymentTx: Payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: signer.address,
        Amount: {
          currency: currencyCode,
          value: '1000000000',
          issuer: issuerWallet.address,
        },
      };

      await this.client.submit(paymentTx, {
        wallet: issuerWallet,
        autofill: true,
        failHard: true,
      });

      // if (
      //   (paymentResult.result.meta as any).TransactionResult !== 'tesSUCCESS'
      // ) {
      //   throw new Error('Failed to issue tokens');
      // }

      return true;
    } catch (error) {
      this.logger.error('Failed to setup token on XRPL:', error);
      throw error;
    }
  }

  private formatCurrencyCode(symbol: string): string {
    // Ensure symbol is uppercase and exactly 3 characters
    if (symbol.length > 3) {
      symbol = symbol.substring(0, 3);
    }
    return symbol.toUpperCase().padEnd(3, ' ');
  }
}
