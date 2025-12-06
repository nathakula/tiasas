/**
 * E*TRADE API Client
 * https://apisb.etrade.com/docs/api/account/api-account-v1.html
 */

import { ETradeOAuth } from './oauth';

export interface ETradeAccount {
  accountId: string;
  accountIdKey: string;
  accountMode: string;
  accountDesc: string;
  accountName: string;
  accountType: string;
  institutionType: string;
  accountStatus: string;
  closedDate?: number;
}

export interface ETradePosition {
  positionId: number;
  Product: {
    symbol: string;
    securityType: string;
    securitySubType?: string;
  };
  symbolDescription: string;
  dateAcquired: number;
  pricePaid: number;
  quantity: number;
  positionType: string;
  daysGain?: number;
  daysGainPct?: number;
  marketValue?: number;
  totalCost?: number;
  totalGain?: number;
  totalGainPct?: number;
  pctOfPortfolio?: number;
  costPerShare?: number;
  todayCommissions?: number;
  todayFees?: number;
  todayPricePaid?: number;
  todayQuantity?: number;
  quotestatus?: string;
}

export interface ETradeBalance {
  accountId: string;
  accountType: string;
  optionLevel: string;
  accountDescription: string;
  quoteMode: number;
  dayTraderStatus: string;
  accountMode: string;
  Cash: {
    fundsForOpenOrdersCash: number;
    moneyMktBalance: number;
  };
  Computed: {
    cashAvailableForInvestment: number;
    cashAvailableForWithdrawal: number;
    totalAvailableForWithdrawal: number;
    netCash: number;
    cashBalance: number;
    settledCashForInvestment: number;
    unSettledCashForInvestment: number;
    fundsWithheldFromPurchasePower: number;
    fundsWithheldFromWithdrawal: number;
    marginBuyingPower: number;
    cashBuyingPower: number;
    dtMarginBuyingPower: number;
    dtCashBuyingPower: number;
    shortAdjustBalance: number;
    regtEquity: number;
    regtEquityPercent: number;
    accountBalance: number;
  };
}

export class ETradeClient {
  private oauth: ETradeOAuth;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor(
    consumerKey: string,
    consumerSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    sandbox: boolean = false
  ) {
    this.oauth = new ETradeOAuth({
      consumerKey,
      consumerSecret,
      sandbox,
    });
    this.accessToken = accessToken;
    this.accessTokenSecret = accessTokenSecret;
  }

  /**
   * Get list of accounts
   */
  async getAccounts(): Promise<ETradeAccount[]> {
    const response = await this.oauth.makeAuthenticatedRequest(
      'GET',
      '/v1/accounts/list',
      this.accessToken,
      this.accessTokenSecret
    );

    if (!response.AccountListResponse?.Accounts?.Account) {
      return [];
    }

    const accounts = response.AccountListResponse.Accounts.Account;
    return Array.isArray(accounts) ? accounts : [accounts];
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountIdKey: string): Promise<ETradeBalance> {
    const response = await this.oauth.makeAuthenticatedRequest(
      'GET',
      `/v1/accounts/${accountIdKey}/balance`,
      this.accessToken,
      this.accessTokenSecret,
      { instType: 'BROKERAGE', realTimeNAV: 'true' }
    );

    return response.BalanceResponse;
  }

  /**
   * Get account positions
   */
  async getPositions(accountIdKey: string): Promise<ETradePosition[]> {
    const response = await this.oauth.makeAuthenticatedRequest(
      'GET',
      `/v1/accounts/${accountIdKey}/portfolio`,
      this.accessToken,
      this.accessTokenSecret,
      { count: '100' }
    );

    if (!response.PortfolioResponse?.AccountPortfolio) {
      return [];
    }

    const portfolio = response.PortfolioResponse.AccountPortfolio;

    // Handle both single and multiple portfolios
    const portfolios = Array.isArray(portfolio) ? portfolio : [portfolio];

    // Extract positions from all portfolios
    const allPositions: ETradePosition[] = [];
    for (const p of portfolios) {
      if (p.Position) {
        const positions = Array.isArray(p.Position) ? p.Position : [p.Position];
        allPositions.push(...positions);
      }
    }

    return allPositions;
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(
    accountIdKey: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    const params: Record<string, string> = {
      count: '100',
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await this.oauth.makeAuthenticatedRequest(
      'GET',
      `/v1/accounts/${accountIdKey}/transactions`,
      this.accessToken,
      this.accessTokenSecret,
      params
    );

    if (!response.TransactionListResponse?.Transaction) {
      return [];
    }

    const transactions = response.TransactionListResponse.Transaction;
    return Array.isArray(transactions) ? transactions : [transactions];
  }
}
