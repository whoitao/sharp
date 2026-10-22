import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { loadSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: NavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(loadSettings());
  }, [dispatch]);

  const menuItems = [
    {
      label: t.studyRecords,
      icon: '📊',
      onPress: () => navigation.navigate('Records'),
    },
    {
      label: t.wrongQuestions,
      icon: '',
      onPress: () => navigation.navigate('WrongQuestions'),
    },
    {
      label: t.settings,
      icon: '',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { padding: 16 * spacing, paddingBottom: 40 * spacing }]}>
      {/* User info */}
      <View style={[styles.userCard, { backgroundColor: colors.accentBackground, padding: 24 * spacing, borderRadius: 12 * radius, marginBottom: 20 * spacing }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface, width: 72 * spacing, height: 72 * spacing, borderRadius: 36 * spacing, marginBottom: 14 * spacing }]}>
          <Text style={[styles.avatar, { color: colors.accent, fontSize: 30 * font }]}>
            {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.text, fontSize: 20 * font, marginBottom: 4 * spacing }]}>{user?.nickname ?? user?.username ?? t.defaultUser}</Text>
        <Text style={[styles.userSub, { color: colors.textSecondary, fontSize: 14 * font }]}>@{user?.username ?? ''}</Text>
      </View>

      {/* Menu */}
      <View style={[styles.menuSection, { backgroundColor: colors.surface, borderRadius: 12 * radius, marginBottom: 24 * spacing }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              { paddingHorizontal: 12 * spacing, paddingVertical: 12 * spacing },
              index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.background, width: 36 * spacing, height: 36 * spacing, borderRadius: 10 * radius, marginRight: 12 * spacing }]}>
              <Text style={[styles.menuIcon, { fontSize: 18 * font }]}>{item.icon}</Text>
            </View>
            <Text style={[styles.menuLabel, { color: colors.text, fontSize: 16 * font }]}>{item.label}</Text>
            <Text style={[styles.menuArrow, { color: colors.textTertiary, fontSize: 22 * font }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    fontSize: 30,
    fontWeight: '700',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userSub: {
    fontSize: 14,
  },
  menuSection: {
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});

export default ProfileScreen;
