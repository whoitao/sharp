import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PetSpeciesInfo } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { cardShadow } from '../../theme/shadows';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'PetAdopt'>;

interface PetAdoptScreenProps {
  navigation: NavigationProp;
}

const PetAdoptScreen: React.FC<PetAdoptScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const [species, setSpecies] = useState<PetSpeciesInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPetSpecies().then((list) => {
      if (!alive) return;
      setSpecies(list);
      setSelectedId(list[0]?.id ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const handleAdopt = useCallback(async () => {
    const name = nickname.trim();
    if (!selectedId) return;
    if (name.length === 0 || name.length > 8) {
      Alert.alert(t.petAdoptTitle, t.petNicknameInvalid);
      return;
    }

    setSubmitting(true);
    try {
      await api.adoptPet(selectedId, name);
      navigation.replace('Pet');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'PET_ALREADY_ADOPTED') {
        Alert.alert(t.petAdoptTitle, t.petAlreadyAdopted, [
          { text: 'OK', onPress: () => navigation.replace('Pet') },
        ]);
      } else if (message === 'INVALID_NICKNAME') {
        Alert.alert(t.petAdoptTitle, t.petNicknameInvalid);
      } else {
        Alert.alert(t.petAdoptTitle, t.petAdoptFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }, [navigation, nickname, selectedId, t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 32 * spacing }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>{t.petAdoptHint}</Text>

      <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '600', marginTop: 16 * spacing }}>
        {t.petAdoptNickname}
      </Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        maxLength={8}
        placeholder={t.petAdoptNicknamePlaceholder}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            borderRadius: 12 * radius,
            paddingHorizontal: 12 * spacing,
            fontSize: 15 * font,
            marginTop: 8 * spacing,
          },
        ]}
      />

      <TouchableOpacity
        onPress={handleAdopt}
        disabled={!selectedId || submitting}
        style={[
          styles.submit,
          {
            backgroundColor: selectedId && !submitting ? colors.accent : colors.border,
            borderRadius: 12 * radius,
            marginTop: 12 * spacing,
          },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.submitText}>{t.petAdoptConfirm}</Text>
        )}
      </TouchableOpacity>

      <View style={[styles.grid, { marginTop: 20 * spacing }]}>
        {species.map((item) => {
          const active = item.id === selectedId;
          const cover = item.stages[0]?.imageUrl;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.card,
                {
                  backgroundColor: active ? colors.accentLight : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                  borderRadius: 16 * radius,
                  padding: 12 * spacing,
                },
                cardShadow(isDark),
              ]}
            >
              {cover ? (
                <Image source={{ uri: cover }} contentFit="contain" style={styles.cover} />
              ) : (
                <Text style={{ fontSize: 48 }}>{item.icon ?? '🐾'}</Text>
              )}
              <View style={styles.cardTitleRow}>
                <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}>{item.name}</Text>
                {active && <Ionicons name="checkmark-circle" size={16 * font} color={colors.accent} />}
              </View>
              {item.tagline ? (
                <Text
                  numberOfLines={2}
                  style={{ color: colors.textTertiary, fontSize: 11 * font, marginTop: 2 * spacing }}
                >
                  {item.tagline}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  card: {
    width: '48%',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cover: {
    width: 96,
    height: 96,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
  submit: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default PetAdoptScreen;
