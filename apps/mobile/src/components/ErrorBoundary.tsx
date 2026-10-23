import React, { Component, Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import { appendCrash } from '../utils/crashLog';

interface ErrorBoundaryProps {
  /** 出错位置标识，写入崩溃日志用于定位 */
  scope: string;
  /** 重建子树前清理容易再次出错的外部状态 */
  onRetry?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** 每重试一次自增，用 key 强制重挂子树 */
  attempt: number;
}

interface CrashFallbackProps {
  scope: string;
  error: Error;
  onRetry: () => void;
}

const CrashFallback: React.FC<CrashFallbackProps> = ({ scope, error, onRetry }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: 24 * spacing }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: 16 * radius, padding: 20 * spacing },
        ]}
      >
        <Text style={[styles.title, { color: colors.text, fontSize: 20 * font }]}>{t.crashTitle}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary, fontSize: 14 * font, marginTop: 8 * spacing }]}>
          {t.crashDesc}
        </Text>
        <Text style={[styles.scope, { color: colors.textTertiary, fontSize: 13 * font, marginTop: 8 * spacing }]}>
          {`${t.crashScope}: ${scope}`}
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.accent, borderRadius: 12 * radius, paddingVertical: 14 * spacing },
          ]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryText, { color: colors.surface, fontSize: 16 * font }]}>{t.crashRetry}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ paddingVertical: 12 * spacing }}
          onPress={() => setShowDetails((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>
            {showDetails ? t.crashHideDetails : t.crashDetails}
          </Text>
        </TouchableOpacity>

        {showDetails && (
          <ScrollView
            style={[
              styles.details,
              { backgroundColor: colors.background, borderRadius: 10 * radius, padding: 12 * spacing },
            ]}
          >
            <Text selectable style={{ color: colors.textSecondary, fontSize: 12 * font, lineHeight: 18 * font }}>
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontWeight: '600',
  },
  desc: {
    lineHeight: 20,
  },
  scope: {
    fontVariant: ['tabular-nums'],
  },
  primaryButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '600',
  },
  details: {
    maxHeight: 260,
  },
});

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    void appendCrash(this.props.scope, error, info.componentStack);
    // 开发版照常交给 RN，红屏的原始堆栈比兜底页更好定位；异常已经先落盘
    if (__DEV__) throw error;
  }

  private handleRetry = (): void => {
    this.props.onRetry?.();
    this.setState((prev) => ({ error: null, attempt: prev.attempt + 1 }));
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { children } = this.props;
    if (error) {
      return <CrashFallback scope={this.props.scope} error={error} onRetry={this.handleRetry} />;
    }
    return <Fragment key={this.state.attempt}>{children}</Fragment>;
  }
}

export default ErrorBoundary;
