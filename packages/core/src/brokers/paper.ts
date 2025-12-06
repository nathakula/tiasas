import { BrokerAdapter } from "./types";

export const PaperBroker: BrokerAdapter = {
  async listAccounts() {
    return [{ id: "paper-1", name: "Paper Account" }];
  },
  async fetchPositions() {
    return [
      { symbol: "SPY", qty: "10", avgPrice: "450.00" },
      { symbol: "QQQ", qty: "5", avgPrice: "380.00" },
    ];
  },
  async fetchTransactions(_accountId, from, to) {
    return [
      { date: from.toISOString(), type: "BUY", symbol: "SPY", qty: "1", price: "450.00" },
      { date: to.toISOString(), type: "SELL", symbol: "SPY", qty: "1", price: "455.00" },
    ];
  },
  async fetchDayPnl(_accountId, date) {
    return { realized: "25.00", unrealized: "-5.00" };
  },
};

