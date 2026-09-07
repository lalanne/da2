import type { ReactNode } from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { theme, type ThemeColor, type TypeVariant } from '../theme';

interface Props extends Omit<TextProps, 'style'> {
  variant?: TypeVariant;
  color?: ThemeColor;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}

/** The only text component (spec 007). */
export function Text({ variant = 'body', color, align, style, ...rest }: Props) {
  const t = theme.type[variant];
  const resolved =
    color != null
      ? theme.colors[color]
      : variant === 'caption'
        ? theme.colors.textSecondary
        : theme.colors.textPrimary;

  return (
    <RNText
      style={[
        {
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          fontWeight: t.fontWeight,
          color: resolved,
        },
        align != null ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
