import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    gradient: ['#BFDBFE', '#93C5FD'],
    icon: '',
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
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % BANNERS.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < BANNERS.length) {
      setActiveIndex(index);
    }
  };

  const renderItem = ({ item }: { item: BannerItem }) => (
    <View style={[styles.slide, { backgroundColor: item.gradient[0] }]}>
      <View style={styles.slideContent}>
        <Text style={styles.icon}>{item.icon}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
          length: SCREEN_WIDTH - 32,
          offset: (SCREEN_WIDTH - 32) * index,
          index,
        })}
        snapToInterval={SCREEN_WIDTH - 32}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.dots}>
        {BANNERS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
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
  listContent: {
    paddingHorizontal: 16,
  },
  slide: {
    width: SCREEN_WIDTH - 32,
    height: 140,
    borderRadius: 20,
    marginHorizontal: 0,
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
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
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
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#10B981',
    width: 18,
  },
});

export default BannerCarousel;
