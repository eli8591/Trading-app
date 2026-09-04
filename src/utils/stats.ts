import { DailyLossReset, Trade } from '../types';
import { DailyPnl, groupTradesByTradingDay } from './drawdown';

export interface TradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestDay: DailyPnl | null;
  worstDay: DailyPnl | null;
  days: DailyPnl[];
}

export function computeTradeStats(trades: Trade[], resetRule: DailyLossReset): TradeStats {
  const wins = trades.filter((t) => t.amount > 0);
  const losses = trades.filter((t) => t.amount < 0);
  const days = groupTradesByTradingDay(trades, resetRule);

  const bestDay = days.length ? days.reduce((best, d) => (d.pnl > best.pnl ? d : best)) : null;
  const worstDay = days.length ? days.reduce((worst, d) => (d.pnl < worst.pnl ? d : worst)) : null;

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin: wins.length ? wins.reduce((sum, t) => sum + t.amount, 0) / wins.length : 0,
    avgLoss: losses.length ? losses.reduce((sum, t) => sum + t.amount, 0) / losses.length : 0,
    bestDay,
    worstDay,
    days,
  };
}
