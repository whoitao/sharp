import { Ionicons } from '@expo/vector-icons';
import type { SubjectOverview } from '@sharp/shared';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { cardShadow } from '../../theme/shadows';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function isIoniconName(value?: string | null): value is IoniconName {
  return !!value && value in Ionicons.glyphMap;
}

interface SubjectRowProps {
  item: SubjectOverview;
  onPress: () => void;
}

const SubjectRow: React.FC<SubjectRowProps> = ({ item, onPress }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  // 0 题的学科不可练，降级成灰底 + 虚线图标，避免和可用学科同权重
  const empty = item.questionCount === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.row,
        empty ? null : cardShadow(isDark),
        {
          backgroundColor: empty ? colors.surfaceSecondary : colors.surface,
          borderColor: empty ? colors.borderLight : colors.border,
          borderRadius: 14 * radius,
          padding: 12 * spacing,
        },
      ]}
    >
      <View style={styles.top}>
        <View
          style={{
            backgroundColor: empty ? 'transparent' : colors.accentLight,
            borderColor: empty ? colors.border : 'transparent',
            borderWidth: empty ? 1 : 0,
            borderStyle: empty ? 'dashed' : 'solid',
            width: 38 * spacing,
            height: 38 * spacing,
            borderRadius: 11 * radius,
            marginRight: 11 * spacing,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isIoniconName(item.icon) ? item.icon : 'school-outline'}
            size={19 * font}
            color={empty ? colors.textTertiary : colors.accentStrong}
          />
        </View>
        <View style={styles.main}>
          <Text
            numberOfLines={1}
            style={{
              color: empty ? colors.textTertiary : colors.text,
              fontSize: 15 * font,
              fontWeight: '600',
            }}
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: colors.textTertiary, fontSize: 11.5 * font, marginTop: 2 * spacing }}
          >
            {empty
              ? t.homeNoQuestions
              : `${t.subjectQuestionCount(item.questionCount)} · ${t.subjectProgressLabel(item.progress)}`}
          </Text>
        </View>
        <View style={styles.right}>
          {!empty && (
            <Text
              style={{
                color: item.progress > 0 ? colors.accentStrong : colors.textTertiary,
                fontSize: 14 * font,
                fontWeight: '700',
                marginRight: 6 * spacing,
              }}
            >
              {item.progress}%
            </Text>
          )}
          <Ionicons name="chevron-forward" size={15 * font} color={colors.textTertiary} />
        </View>
      </View>
      {!empty && (
        <View
          style={{
            backgroundColor: colors.borderLight,
            height: 4,
            borderRadius: 2,
            marginTop: 10 * spacing,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              backgroundColor: colors.accent,
              width: `${item.progress}%` as `${number}%`,
              height: '100%',
              borderRadius: 2,
            }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SubjectRow;
