import { useSelector } from 'react-redux';
import type { Density } from '@sharp/shared';
import type { RootState } from '../stores';

interface DensityScale {
  /** 控件 padding / margin 间距缩放 */
  spacing: number;
  /** 字体大小缩放 */
  font: number;
  /** 圆角缩放 */
  radius: number;
}

const DENSITY_SCALES: Record<Density, DensityScale> = {
  compact: { spacing: 0.78, font: 0.88, radius: 0.85 },
  comfortable: { spacing: 1, font: 1, radius: 1 },
  spacious: { spacing: 1.28, font: 1.14, radius: 1.15 },
};

export const useDensity = (): DensityScale & { density: Density } => {
  const density = useSelector((state: RootState) => state.settings.density);
  return { density, ...DENSITY_SCALES[density] };
};
