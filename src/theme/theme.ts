export const colors = {
  background: '#0A0A0F',
  backgroundElevated: '#111118',
  surface: 'rgba(255,255,255,0.05)',
  surfaceBorder: 'rgba(255,255,255,0.09)',
  textPrimary: '#F4F6FB',
  textSecondary: '#8B93A7',
  textMuted: '#5A6178',

  safe: '#00D9FF',
  safeGlow: 'rgba(0,217,255,0.35)',
  caution: '#FFB800',
  cautionGlow: 'rgba(255,184,0,0.35)',
  danger: '#FF3B5C',
  dangerGlow: 'rgba(255,59,92,0.45)',

  track: 'rgba(255,255,255,0.08)',
  positive: '#00D9FF',
  negative: '#FF3B5C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const fonts = {
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  monoLight: 'JetBrainsMono_400Regular',
  display: 'SpaceMono_700Bold',
} as const;

export type StatusColorKey = 'safe' | 'caution' | 'breached';

export function statusColor(status: StatusColorKey): string {
  return status === 'breached' ? colors.danger : colors[status];
}

export function statusGlow(status: StatusColorKey): string {
  if (status === 'safe') return colors.safeGlow;
  if (status === 'caution') return colors.cautionGlow;
  return colors.dangerGlow;
}
