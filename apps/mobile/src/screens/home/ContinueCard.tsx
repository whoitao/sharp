import { Ionicons } from '@expo/vector-icons';
import type { SubjectOverview } from '@sharp/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { gradients } from '../../theme/gradients';
import { cardShadow } from '../../theme/shadows';

// accentStrong 作底时需要白字才能到 4.5:1
const ON_ACCENT_LIGHT = '#FFFFFF';

interface ContinueCardProps {
  subject: SubjectOverview | null;
  onPress: () => void;
}

/**
 * 首页学科轮播里的一张卡：一科一张，点开直达该科的学习页
 */
const ContinueCard: React.FC<ContinueCardProps> = ({ subject, onPress }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const onAccent = isDark ? colors.background : ON_ACCENT_LIGHT;
  const borderRadius = 12 * radius;

  return (
    <View style={[styles.shadow, cardShadow(isDark), { borderRadius }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            borderRadius,
            borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? gradients.dark.heroCard : gradients.light.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.row, { padding: 12 * spacing, gap: 10 * spacing }]}>
          <View style={styles.main}>
            <Text
              numberOfLines={1}
              style={{
                color: colors.text,
                fontSize: (subject ? 18 : 16) * font,
                fontWeight: '700',
              }}
            >
              {subject ? subject.name : t.studySelectSubject}
            </Text>
            {subject && (
              <Text
                numberOfLines={1}
                style={{
                  color: colors.textSecondary,
                  fontSize: 12 * font,
                  marginTop: 2 * spacing,
                }}
              >
                {t.subjectQuestionCount(subject.questionCount)} · {t.subjectProgressLabel(subject.progress)}
              </Text>
            )}
            <View
              style={[
                styles.cta,
                {
                  backgroundColor: colors.accentStrong,
                  borderRadius: 6 * radius,
                  marginTop: 8 * spacing,
                  paddingHorizontal: 10 * spacing,
                },
              ]}
            >
              <Text style={{ color: onAccent, fontSize: 12 * font, fontWeight: '600' }}>
                {subject ? t.homeContinueAction : t.startLearning}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={12 * font}
                color={onAccent}
                style={{ marginLeft: 4 * spacing }}
              />
            </View>
          </View>
          {subject && (
            <View
              style={[
                styles.ring,
                {
                  borderColor: colors.accent,
                  width: 52 * spacing,
                  height: 52 * spacing,
                  borderRadius: 26 * spacing,
                },
              ]}
            >
              <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '700' }}>
                {subject.progress}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ContinueCard;
