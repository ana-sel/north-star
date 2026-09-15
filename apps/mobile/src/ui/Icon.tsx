/**
 * Line icon set mirroring docs/design/wireframes/shared/you.css.
 * Add new icons here as screens need them. Keep stroke width and viewBox
 * consistent so sizes read the same across the app.
 */

import { memo } from 'react';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import { colors } from '@styles/theme';

export type IconName =
  | 'sun'
  | 'activity'
  | 'drop'
  | 'wind'
  | 'brain'
  | 'pen'
  | 'shield'
  | 'target'
  | 'user'
  | 'sliders'
  | 'msg'
  | 'chev'
  | 'chev-down'
  | 'plus'
  | 'check'
  | 'x'
  | 'moon'
  | 'leaf'
  | 'layers'
  | 'compass'
  | 'sparkle';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function IconInner({ name, size = 20, color = colors.ink, strokeWidth = 2 }: IconProps) {
  const stroke = color;
  const p = { stroke, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (name) {
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" {...p} />
        </Svg>
      );
    case 'activity':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M22 12h-4l-3 9L9 3l-3 9H2" {...p} />
        </Svg>
      );
    case 'drop':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3c-3.5 4.6-6 7.3-6 10a6 6 0 0 0 12 0c0-2.7-2.5-5.4-6-10Z" {...p} />
        </Svg>
      );
    case 'wind':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 8h8a2 2 0 1 0-2-2" {...p} />
          <Path d="M2 12h14a2 2 0 1 1-2 2" {...p} />
          <Path d="M4 16h7a2 2 0 1 1-2 2" {...p} />
        </Svg>
      );
    case 'brain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 7a3 3 0 0 1 6 0 3 3 0 0 1 2 5 4 4 0 0 1-2 7H9a4 4 0 0 1-2-7 3 3 0 0 1 2-5Z" {...p} />
          <Path d="M12 5v14M9.5 10H12M12 14h2.5" {...p} />
        </Svg>
      );
    case 'pen':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 20H4a1 1 0 0 1-1-1v-8" {...p} />
          <Path d="m18.5 3.5 2 2a2.1 2.1 0 0 1 0 3l-8.6 8.6-4.4 1.4 1.4-4.4 8.6-8.6a2.1 2.1 0 0 1 3 0Z" {...p} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3 5 6v6c0 4.8 2.9 7.8 7 9 4.1-1.2 7-4.2 7-9V6Z" {...p} />
        </Svg>
      );
    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...p} />
          <Circle cx={12} cy={12} r={5} {...p} />
          <Circle cx={12} cy={12} r={1.4} {...p} fill={stroke} />
        </Svg>
      );
    case 'user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" {...p} />
        </Svg>
      );
    case 'sliders':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={21} x2={14} y1={4} y2={4} {...p} />
          <Line x1={10} x2={3} y1={4} y2={4} {...p} />
          <Line x1={21} x2={12} y1={12} y2={12} {...p} />
          <Line x1={8} x2={3} y1={12} y2={12} {...p} />
          <Line x1={21} x2={16} y1={20} y2={20} {...p} />
          <Line x1={12} x2={3} y1={20} y2={20} {...p} />
          <Line x1={14} x2={14} y1={2} y2={6} {...p} />
          <Line x1={8} x2={8} y1={10} y2={14} {...p} />
          <Line x1={16} x2={16} y1={18} y2={22} {...p} />
        </Svg>
      );
    case 'msg':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" {...p} />
        </Svg>
      );
    case 'chev':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 6l6 6-6 6" {...p} strokeWidth={strokeWidth + 0.2} />
        </Svg>
      );
    case 'chev-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 9l6 6 6-6" {...p} strokeWidth={strokeWidth + 0.2} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" {...p} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12l5 5L20 7" {...p} strokeWidth={strokeWidth + 0.4} />
        </Svg>
      );
    case 'x':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M18 6L6 18M6 6l12 12" {...p} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" {...p} />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" {...p} />
          <Path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" {...p} />
        </Svg>
      );
    case 'layers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" {...p} />
          <Path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" {...p} />
          <Path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" {...p} />
        </Svg>
      );
    case 'compass':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} {...p} />
          <Path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" {...p} />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polygon points="12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10" {...p} />
        </Svg>
      );
  }
}

export const Icon = memo(IconInner);
