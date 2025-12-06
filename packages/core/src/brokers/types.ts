export interface BrokerAdapter {
  listAccounts(): Promise<{ id: string; name: string }[]>;
  fetchPositions(accountId: string): Promise<{ symbol: string; qty: string; avgPrice: string }[]>;
  fetchTransactions(accountId: string, from: Date, to: Date): Promise<{ date: string; type: string; symbol: string; qty: string; price: string }[]>;
  fetchDayPnl(accountId: string, date: Date): Promise<{ realized: string; unrealized: string }>;  
}

