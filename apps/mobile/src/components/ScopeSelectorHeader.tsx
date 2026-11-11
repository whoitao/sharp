import type { Grade, Subject } from '@sharp/shared';
import React, { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import ScopeSelector from './ScopeSelector';

interface ScopeSelectorHeaderProps {
  grades: Grade[];
  subjects: Subject[];
  selectedGrade: Grade | null;
  selectedSubject: Subject | null;
  onChangeGrade: (grade: Grade | null) => void;
  onChangeSubject: (subject: Subject | null) => void;
  /** 导航栏左侧已被其他内容占用的宽度（不含内容区 16 边距），如首页的连续天数 */
  leftOccupiedWidth?: number;
  /** 导航栏右侧已被其他内容占用的宽度（不含内容区 16 边距），如首页的铃铛 */
  rightOccupiedWidth?: number;
}

/**
 * 导航栏居中的教材选择器：胶囊宽度按屏幕中线与左右已占用空间收敛，
 * 长教材名由 ScopeSelector 内部单行尾部省略，保证不与两侧内容重叠。
 */
const ScopeSelectorHeader: React.FC<ScopeSelectorHeaderProps> = ({
  leftOccupiedWidth = 0,
  rightOccupiedWidth = 0,
  ...selectorProps
}) => {
  const { width } = useWindowDimensions();

  const maxWidth = useMemo(() => {
    if (leftOccupiedWidth <= 0 && rightOccupiedWidth <= 0) return 220;
    // Web 上 header 内容从容器 x=0 起排，16 边距由页面自己补；原生由 header 自带 leading inset
    const inset = Platform.OS === 'web' ? 16 : 8;
    const gap = 8;
    const occupied = Math.max(
      leftOccupiedWidth > 0 ? leftOccupiedWidth + inset : 0,
      rightOccupiedWidth > 0 ? rightOccupiedWidth + inset : 0,
    );
    // 胶囊以屏幕中线为轴对称摆放，两侧取更拥挤的一侧计算可用宽度
    return Math.max(96, Math.min(220, Math.floor((width / 2 - occupied - gap) * 2)));
  }, [width, leftOccupiedWidth, rightOccupiedWidth]);

  return <ScopeSelector {...selectorProps} maxWidth={maxWidth} />;
};

export default ScopeSelectorHeader;
