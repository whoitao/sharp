import { Ionicons } from '@expo/vector-icons';
import type { PetDetail } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { cardShadow } from '../../theme/shadows';

interface PetCardProps {
  pet: PetDetail | null;
  onPress: () => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onPress }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  // 头像右边缘与下方快捷入口列（四等分 + 8 间距）对齐，同时保留卡片内边距
  const [cardWidth, setCardWidth] = useState(0);
  const avatarSize =
    cardWidth > 0 ? (cardWidth - 3 * 8 * spacing) / 4 - 12 * spacing : 56 * spacing;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 16 * radius,
          padding: 12 * spacing,
        },
        cardShadow(isDark),
      ]}
    >
      {pet ? (
        <>
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: 12 * radius,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {pet.growthStage.imageUrl ? (
              <Image source={{ uri: pet.growthStage.imageUrl }} contentFit="contain" style={styles.image} />
            ) : (
              <Text style={{ fontSize: avatarSize * 0.45 }}>{pet.species.icon ?? '🐾'}</Text>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 12 * spacing }}>
            <View style={styles.row}>
              <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}>{pet.nickname}</Text>
              <View
                style={{
                  marginLeft: 6 * spacing,
                  paddingHorizontal: 6 * spacing,
                  paddingVertical: 1 * spacing,
                  borderRadius: 999,
                  backgroundColor: colors.accentLight,
                }}
              >
                <Text style={{ color: colors.successText, fontSize: 10 * font }}>{t.petLevel(pet.level)}</Text>
              </View>
            </View>

            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font, marginTop: 2 * spacing }}>
              {pet.species.name} · {pet.growthStage.name} · {t.petCompanionDays(pet.companionDays)}
            </Text>

            <View style={[styles.row, { marginTop: 6 * spacing }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 10 * font, marginRight: 6 * spacing }}>
                {t.petSatiety}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 6 * spacing,
                  borderRadius: 3 * radius,
                  backgroundColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, (pet.satiety / pet.satietyMax) * 100)}%`,
                    height: '100%',
                    backgroundColor: pet.satiety < 30 ? colors.warning : colors.accent,
                  }}
                />
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16 * font} color={colors.textTertiary} />
        </>
      ) : (
        <>
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: 12 * radius,
              backgroundColor: colors.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Text style={{ fontSize: avatarSize * 0.45 }}>🐾</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 * spacing }}>
            <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}>
              {t.petCardEmptyTitle}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font, marginTop: 2 * spacing }}>
              {t.petCardEmptyDesc}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 12 * spacing,
              paddingVertical: 6 * spacing,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11 * font, fontWeight: '600' }}>{t.petAdoptCta}</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default PetCard;
