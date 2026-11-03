import { Ionicons } from '@expo/vector-icons';
import type { PetDetail } from '@sharp/shared';
import { Image } from 'expo-image';
import React from 'react';
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

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
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
              width: 56 * spacing,
              height: 56 * spacing,
              borderRadius: 14 * radius,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {pet.growthStage.imageUrl ? (
              <Image source={{ uri: pet.growthStage.imageUrl }} contentFit="contain" style={styles.image} />
            ) : (
              <Text style={{ fontSize: 26 }}>{pet.species.icon ?? '🐾'}</Text>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 10 * spacing }}>
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
              width: 56 * spacing,
              height: 56 * spacing,
              borderRadius: 14 * radius,
              backgroundColor: colors.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 26 }}>🐾</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 * spacing }}>
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
    width: 48,
    height: 48,
  },
});

export default PetCard;
