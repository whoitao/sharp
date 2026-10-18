import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login, clearError } from '../../stores/authSlice';
import type { RootState, AppDispatch } from '../../stores';
import type { AuthStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../hooks/useTheme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: NavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    dispatch(clearError());
    const result = await dispatch(login({ username: username.trim(), password }));
    if (login.rejected.match(result)) {
      Alert.alert('登录失败', (result.payload as string) || '请重试');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: '#F0FDF4' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>📖</Text>
          <Text style={[styles.title, { color: '#10B981' }]}>Sharp</Text>
          <Text style={[styles.subtitle, { color: '#6B7280' }]}>智能刷题，高效学习</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#374151' }]}>用户名</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', color: '#1F2937' }]}
              placeholder="请输入用户名"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#374151' }]}>密码</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', color: '#1F2937' }]}
              placeholder="请输入密码"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {error ? <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#10B981' }, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>登 录</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { color: '#6B7280' }]}>
              没有账号？<Text style={[styles.linkBold, { color: '#10B981' }]}>立即注册</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
  },
  linkBold: {
    fontWeight: '600',
  },
});

export default LoginScreen;
