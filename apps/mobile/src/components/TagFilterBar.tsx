import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';

export interface Tag {
  id: string;
  name: string;
}

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

/**
 * 标签筛选条：横向滚动的 chips，默认选中"全部"
 * 用于过滤题目列表（中考真题/模拟题/课后练习/竞赛等）
 */
const TagFilterBar: React.FC<TagFilterBarProps> = ({ tags, selectedTagId, onSelectTag }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();

  const allTag: Tag = { id: '__all__', name: '全部' };
  const displayTags = [allTag, ...tags];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 * spacing, paddingVertical: 4 * spacing }}
    >
      {displayTags.map((tag) => {
        const isSelected = tag.id === selectedTagId || (tag.id === '__all__' && !selectedTagId);
        return (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.accentLight : colors.surface,
                borderColor: isSelected ? colors.accent : colors.border,
                borderRadius: 6 * radius,
                paddingHorizontal: 10 * spacing,
                paddingVertical: 5 * spacing,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => onSelectTag(tag.id === '__all__' ? null : tag.id)}
          >
            <Text
              style={{
                color: isSelected ? colors.accent : colors.text,
                fontSize: 12 * font,
                fontWeight: '500',
              }}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default TagFilterBar;
