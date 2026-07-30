import Svg, { Path, Rect } from 'react-native-svg';

interface PokojowoMarkProps {
  size?: number;
  color?: string;
  /** Fill for the small "rooms" windows; defaults to a translucent white. */
  accent?: string;
}

/**
 * Pokojowo brand glyph: a rounded house with two "rooms" windows, nodding to the
 * flatmate/rooms product. Purely vector so it scales crisply at any size.
 */
export default function PokojowoMark({
  size = 64,
  color = '#ffffff',
  accent,
}: PokojowoMarkProps) {
  const windows = accent ?? 'rgba(255,255,255,0.35)';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Roof + house body */}
      <Path
        d="M32 6 6 26v30a4 4 0 0 0 4 4h44a4 4 0 0 0 4-4V26L32 6z"
        fill={color}
      />
      {/* Two room windows */}
      <Rect x="20" y="34" width="10" height="12" rx="2" fill={windows} />
      <Rect x="34" y="34" width="10" height="12" rx="2" fill={windows} />
    </Svg>
  );
}
