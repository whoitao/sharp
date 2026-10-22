import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  gradient: string[];
  icon: string;
}

const bannerStyles: Array<Pick<BannerItem, 'id' | 'gradient' | 'icon'>> = [
  { id: '1', gradient: ['#A7F3D0', '#6EE7B7'], icon: '🎯' },
  { id: '2', gradient: ['#BFDBFE', '#93C5FD'], icon: '' },
  { id: '3', gradient: ['#FDE68A', '#FCD34D'], icon: '📊' },
];

const BannerCarousel: React.FC = () => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const BANNERS: BannerItem[] = useMemo(
    () => [
      { ...bannerStyles[0], title: t.bannerDailyTitle, subtitle: t.bannerDailySubtitle },
      { ...bannerStyles[1], title: t.bannerWrongTitle, subtitle: t.bannerWrongSubtitle },
      { ...bannerStyles[2], title: t.bannerReportTitle, subtitle: t.bannerReportSubtitle },
    ],
    [t]
  );
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
    <View style={[styles.slide, { width: slideWidth, height: 140 * spacing, borderRadius: 12 * radius, backgroundColor: item.gradient[0] }]}>
      <View style={[styles.slideContent, { padding: 24 * spacing }]}>
        <Text style={[styles.icon, { fontSize: 32 * font, marginBottom: 8 * spacing }]}>{item.icon}</Text>
        <Text style={[styles.title, { color: colors.text, fontSize: 22 * font, marginBottom: 4 * spacing }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 14 * font }]}>{item.subtitle}</Text>
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
      <View style={[styles.dots, { marginTop: 12 * spacing }]}>
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
