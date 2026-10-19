import React, { useEffect, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  gradient: string[];
  icon: string;
}

const BANNERS: BannerItem[] = [
  {
    id: '1',
    title: '每日挑战',
    subtitle: '坚持每天练习，提升学习效率',
    gradient: ['#A7F3D0', '#6EE7B7'],
    icon: '🎯',
  },
  {
    id: '2',
    title: '错题回顾',
    subtitle: '智能分析错题，针对性强化训练',
    icon: '',
    gradient: ['#BFDBFE', '#93C5FD'],
  },
  {
    id: '3',
    title: '学习报告',
    subtitle: '查看学习进度和数据分析',
    gradient: ['#FDE68A', '#FCD34D'],
    icon: '📊',
  },
];

const BannerCarousel: React.FC = () => {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const slideWidth = containerWidth;

  useEffect(() => {
    if (slideWidth === 0) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % BANNERS.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex, slideWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth === 0) return;
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / slideWidth);
    if (index !== activeIndex && index >= 0 && index < BANNERS.length) {
      setActiveIndex(index);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  const renderItem = ({ item }: { item: BannerItem }) => (
    <View style={[styles.slide, { width: slideWidth, backgroundColor: item.gradient[0] }]}>
      <View style={styles.slideContent}>
        <Text style={styles.icon}>{item.icon}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
      </View>
    </View>
  );

  if (slideWidth === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <FlatList
        ref={flatListRef}
        data={BANNERS}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: slideWidth,
          offset: slideWidth * index,
          index,
        })}
      />
      <View style={styles.dots}>
        {BANNERS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === activeIndex ? colors.accent : colors.border },
              index === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  slide: {
    height: 140,
    borderRadius: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideContent: {
    padding: 24,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
  },
});

export default BannerCarousel;
