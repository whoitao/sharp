import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from '../../i18n/useTranslation';
import type { AuthStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { clearError, register } from '../../stores/authSlice';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: NavigationProp;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t.alertTitle, t.fillUsernamePassword);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.alertTitle, t.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.alertTitle, t.passwordTooShort);
      return;
    }
    dispatch(clearError());
    const result = await dispatch(register({ username: username.trim(), password }));
    if (register.rejected.match(result)) {
      Alert.alert(t.registerFailed, (result.payload as string) || t.retryLater);
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
          <Text style={[styles.title, { color: '#10B981' }]}>{t.createAccount}</Text>
          <Text style={[styles.subtitle, { color: '#6B7280' }]}>{t.startLearningJourney}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', color: '#1F2937' }]}
              placeholder={t.usernamePlaceholder}
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', color: '#1F2937' }]}
              placeholder={t.passwordMinLengthPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0', color: '#1F2937' }]}
              placeholder={t.confirmPasswordPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {error ? <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#10B981' }, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t.registerButton}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { color: '#6B7280' }]}>
              {t.hasAccount}
              <Text style={[styles.linkBold, { color: '#10B981' }]}>{t.backToLogin}</Text>
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
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    marginBottom: 2,
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

export default RegisterScreen;
