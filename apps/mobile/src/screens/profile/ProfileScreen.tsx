import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadSettings } from '../../stores/settingsSlice';
import type { RootState, AppDispatch } from '../../stores';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: NavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* User info */}
      <View style={[styles.userCard, { backgroundColor: colors.accentBackground }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.avatar, { color: colors.accent }]}>
            {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.text }]}>{user?.nickname ?? user?.username ?? '用户'}</Text>
        <Text style={[styles.userSub, { color: colors.textSecondary }]}>@{user?.username ?? ''}</Text>
      </View>

      {/* Menu */}
      <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.menuArrow, { color: colors.textTertiary }]}>›</Text>
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
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: 20,
    padding: 28,
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
    borderRadius: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
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
