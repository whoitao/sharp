import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { logout } from '../../stores/authSlice';
import { loadSettings } from '../../stores/settingsSlice';
import { api } from '../../services/api';
import type { RootState, AppDispatch } from '../../stores';
import StatCard from '../../components/StatCard';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: NavigationProp;
}

interface Stats {
  totalDays: number;
  totalQuestions: number;
  streak: number;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<Stats>({ totalDays: 0, totalQuestions: 0, streak: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch(loadSettings());
    fetchStats();
  }, [dispatch, fetchStats]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const menuItems = [
    {
      label: '学习记录',
      icon: '📊',
      onPress: () => navigation.navigate('Records'),
    },
    {
      label: '错题本',
      icon: '',
      onPress: () => navigation.navigate('WrongQuestions'),
    },
    {
      label: '设置',
      icon: '',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User info with gradient */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>
            {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.username}>{user?.nickname ?? user?.username ?? '用户'}</Text>
        <Text style={styles.userSub}>@{user?.username ?? ''}</Text>
      </View>

      {/* Stats */}
      {loading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="small" color="#10B981" />
        </View>
      ) : (
        <View style={styles.statsRow}>
          <StatCard title="学习天数" value={stats.totalDays} icon="" color="#10B981" />
          <StatCard title="答题总数" value={stats.totalQuestions} icon="" color="#3B82F6" />
          <StatCard title="连续打卡" value={`${stats.streak}天`} icon="" color="#F59E0B" />
        </View>
      )}

      {/* Menu */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#A7F3D0',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#10B981',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userSub: {
    fontSize: 14,
    color: '#4B5563',
  },
  statsLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: -4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
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
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
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
    color: '#1F2937',
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 22,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
