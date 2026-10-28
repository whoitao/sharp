import type { SubjectOverview } from '@sharp/shared';
import React, { useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import ContinueCard from './ContinueCard';

interface SubjectCarouselProps {
  /** 只传入有题目的学科，一页一科 */
  items: SubjectOverview[];
  onSelect: (subjectId: string) => void;
  /** 一个能学的学科都没有时的兜底入口 */
  onFallbackPress: () => void;
}

const SubjectCarousel: React.FC<SubjectCarouselProps> = ({ items, onSelect, onFallbackPress }) => {
  const { colors } = useTheme();
  const { spacing } = useDensity();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  if (items.length === 0) {
    return <ContinueCard subject={null} onPress={onFallbackPress} />;
  }

  // 与外层内容保持同一 16 边距：负 margin 让卡片可以滑到屏幕边缘
  const gutter = 16 * spacing;
  // 卡间距不能小于边距，否则静止时下一张会从右边露出几个点
  const gap = gutter;
  const cardWidth = width - gutter * 2;
  const interval = cardWidth + gap;
  const activePage = Math.min(page, items.length - 1);

  // 用 onScroll 而不是 onMomentumScrollEnd：react-native-web 不派发 momentum 事件，
  // 而 scrollTo / 手势在两端都会触发 scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / interval);
    if (next !== page) setPage(next);
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ marginHorizontal: -gutter }}
        contentContainerStyle={{ paddingHorizontal: gutter, gap }}
      >
        {items.map((subject) => (
          <View key={subject.id} style={{ width: cardWidth }}>
            <ContinueCard subject={subject} onPress={() => onSelect(subject.id)} />
          </View>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={[styles.dots, { marginTop: 8 * spacing, gap: 6 * spacing }]}>
          {items.map((subject, index) => (
            <View
              key={subject.id}
              style={{
                width: (index === activePage ? 16 : 6) * spacing,
                height: 6 * spacing,
                borderRadius: 3 * spacing,
                backgroundColor: index === activePage ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SubjectCarousel;
