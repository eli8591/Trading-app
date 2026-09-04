import { PropFirmRules } from '../types';

/**
 * Starting points for common prop-firm rule shapes. Dollar amounts always come from the
 * account setup form (they depend on account size), so presets only set the rule
 * *structure*. Firms change their rulebooks, so always verify against the current
 * rulebook before trusting these for a real account.
 */
export interface FirmPreset {
  id: string;
  label: string;
  description: string;
  rules: Omit<PropFirmRules, 'drawdown'> & {
    drawdown: Omit<PropFirmRules['drawdown'], 'amount'>;
  };
}

export const FIRM_PRESETS: FirmPreset[] = [
  {
    id: 'tradovate-intraday-trailing',
    label: 'Tradovate-funded (e.g. Lucid Trading)',
    description: 'Real-time trailing max drawdown that stops trailing once it reaches your starting balance.',
    rules: {
      drawdown: { mode: 'intraday_trailing', capAtBreakeven: true },
      dailyLoss: { baselineType: 'prior_day_close', resetRule: 'session_5pm_et', limitType: 'fixed', value: 0 },
      consistency: { enabled: true, maxSingleDayPercent: 30 },
    },
  },
  {
    id: 'eod-trailing',
    label: 'End-of-day trailing drawdown',
    description: 'Trailing floor only moves based on end-of-day balance; intraday swings on the same day are ignored.',
    rules: {
      drawdown: { mode: 'eod_trailing', capAtBreakeven: true },
      dailyLoss: { baselineType: 'prior_day_close', resetRule: 'session_5pm_et', limitType: 'fixed', value: 0 },
      consistency: { enabled: false, maxSingleDayPercent: 30 },
    },
  },
  {
    id: 'static-drawdown',
    label: 'Static max drawdown',
    description: 'Fixed drawdown floor below your starting balance that never trails upward.',
    rules: {
      drawdown: { mode: 'static', capAtBreakeven: false },
      dailyLoss: { baselineType: 'starting_balance', resetRule: 'midnight_local', limitType: 'fixed', value: 0 },
      consistency: { enabled: false, maxSingleDayPercent: 30 },
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Configure every rule yourself.',
    rules: {
      drawdown: { mode: 'static', capAtBreakeven: false },
      dailyLoss: { baselineType: 'prior_day_close', resetRule: 'session_5pm_et', limitType: 'fixed', value: 0 },
      consistency: { enabled: false, maxSingleDayPercent: 30 },
    },
  },
];
