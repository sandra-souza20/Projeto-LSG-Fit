/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    card: '#F7F7F9',
    border: '#E2E3E8',
    inputBackground: '#EEEFF3',
    accent: '#8FCB00',
    accentText: '#0A0A0A',
    danger: '#D92D20',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    card: '#141414',
    // Identidade visual do TCC (secao 11): preto #000000, verde #CCFF00,
    // branco #FFFFFF e cinza complementar #323232.
    border: '#323232',
    inputBackground: '#212225',
    accent: '#CCFF00',
    accentText: '#0A0A0A',
    danger: '#FF6B6B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Tipografia do TCC: Montserrat Regular, Medium, Semibold e Bold. Cada peso e
// uma familia separada (no Android o fontWeight nao troca o peso de uma fonte
// carregada), entao o texto escolhe a familia pelo peso pedido.
export const FontFamily = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
} as const;

export function fontFamilyForWeight(weight: string | number | undefined) {
  const value = weight === 'bold' ? 700 : Number(weight) || 400;
  if (value >= 700) return FontFamily.bold;
  if (value >= 600) return FontFamily.semibold;
  if (value >= 500) return FontFamily.medium;
  return FontFamily.regular;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
} as const;
