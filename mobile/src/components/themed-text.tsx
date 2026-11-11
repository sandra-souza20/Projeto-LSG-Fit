import { Children, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyForWeight, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

// Android mede a largura do texto antes de aplicar textTransform e corta a
// ultima letra quando o texto fica mais largo em maiusculas ("Terç", "Academi").
// Por isso o texto e convertido aqui e o textTransform e desligado.
function toUppercase(children: ReactNode): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' ? child.toLocaleUpperCase('pt-BR') : child,
  );
}

const NO_TRANSFORM = { textTransform: 'none' } as const;

const isAndroid = Platform.OS === 'android';

export function ThemedText({ style, type = 'default', themeColor, children, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const composed = [
    { color: theme[themeColor ?? 'text'] },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'subtitle' && styles.subtitle,
    type === 'link' && styles.link,
    type === 'linkPrimary' && styles.linkPrimary,
    type === 'code' && styles.code,
    style,
  ];

  // Montserrat (identidade visual): a familia certa para o peso final do texto.
  // Quem define fontFamily (ex.: texto em fonte mono) fica como esta.
  const flat: TextStyle = StyleSheet.flatten(composed) ?? {};
  const brandFont = flat.fontFamily
    ? null
    : { fontFamily: fontFamilyForWeight(flat.fontWeight), fontWeight: 'normal' as const };

  const isUppercase = flat.textTransform === 'uppercase';
  // Android nao soma o letterSpacing da ultima letra na largura medida.
  const letterSpacingFix =
    isAndroid && flat.letterSpacing ? { paddingRight: Math.ceil(Math.abs(flat.letterSpacing)) } : null;

  return (
    <Text
      // Android: com a quebra "highQuality" (padrao) e a Montserrat, a largura
      // medida sai menor que a desenhada e a ultima letra vai para uma segunda
      // linha escondida ("Terç", "Segund", "Academi"). A "simple" mede certo.
      textBreakStrategy="simple"
      style={[composed, brandFont, isUppercase && NO_TRANSFORM, letterSpacingFix]}
      {...rest}>
      {isUppercase ? toUppercase(children) : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 20,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 20,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
