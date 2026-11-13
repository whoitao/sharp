import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import type { ScopeCapsuleRect } from './ScopeSelector';

interface ScopeHintOverlayProps {
  visible: boolean;
  /** 选择器胶囊在窗口中的位置；null 时走降级位置，保证蒙层可用 */
  targetRect: ScopeCapsuleRect | null;
  /** 点击「去选择」或高亮区 */
  onSelect: () => void;
  /** 点击「跳过」或遮罩空白处 */
  onDismiss: () => void;
}

const RING_GAP = 8;
const RING_RADIUS = 18;

/**
 * 首次登录「选择教材」引导蒙层：半透明遮罩挖洞高亮顶部选择器，
 * 气泡说明 + 「去选择 / 跳过」。只在首页空态时由首页控制显示。
 */
const ScopeHintOverlay: React.FC<ScopeHintOverlayProps> = ({
  visible,
  targetRect,
  onSelect,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 目标框：测量不到时按「屏幕中线 + header 高度」估一个，再统一钳制在屏幕内
  const box = useMemo(() => {
    const base = targetRect ?? {
      x: Math.max(12, width / 2 - 110),
      y: insets.top + 36,
      width: Math.min(220, Math.max(120, width - 24)),
      height: 36,
    };
    const rectWidth = Math.min(Math.max(base.width, 80), Math.max(80, width - 16));
    const rectHeight = Math.min(Math.max(base.height, 24), Math.max(24, height - 16));
    const x = Math.max(8, Math.min(base.x, width - rectWidth - 8));
    const y = Math.max(8, Math.min(base.y, height - rectHeight - 8));
    return {
      x: x - RING_GAP,
      y: y - RING_GAP,
      width: rectWidth + RING_GAP * 2,
      height: rectHeight + RING_GAP * 2,
    };
  }, [targetRect, width, height, insets.top]);

  const ringBottom = box.y + box.height;
  // 气泡优先放高亮框下方；横屏/小屏放不下时翻到上方，避免超出屏幕
  const showBelow = ringBottom + 200 <= height - insets.bottom;
  const bubbleSpace = showBelow
    ? { top: ringBottom + 28 }
    : { bottom: height - box.y + 28 };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root} accessibilityViewIsModal>
        {/* 四块遮罩围出挖洞，点击任意遮罩区域视为跳过 */}
        <Pressable
          onPress={onDismiss}
          style={[styles.dim, { backgroundColor: colors.overlay, left: 0, top: 0, width, height: box.y }]}
        />
        <Pressable
          onPress={onDismiss}
          style={[
            styles.dim,
            {
              backgroundColor: colors.overlay,
              left: 0,
              top: ringBottom,
              width,
              height: Math.max(0, height - ringBottom),
            },
          ]}
        />
        <Pressable
          onPress={onDismiss}
          style={[
            styles.dim,
            {
              backgroundColor: colors.overlay,
              left: 0,
              top: box.y,
              width: Math.max(0, box.x),
              height: box.height,
            },
          ]}
        />
        <Pressable
          onPress={onDismiss}
          style={[
            styles.dim,
            {
              backgroundColor: colors.overlay,
              left: box.x + box.width,
              top: box.y,
              width: Math.max(0, width - box.x - box.width),
              height: box.height,
            },
          ]}
        />

        {/* 高亮框：挖洞位置的描边，点它等同于「去选择」 */}
        <Pressable
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityLabel={t.scopeTitle}
          style={{
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            borderWidth: 2,
            borderColor: colors.accent,
            borderRadius: RING_RADIUS,
            backgroundColor: 'transparent',
          }}
        />

        {/* 气泡 */}
        <View style={[styles.bubbleWrap, { left: 24, right: 24 }, bubbleSpace]}>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: colors.surface,
                borderRadius: 16 * radius,
                padding: 16 * spacing,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.arrow,
                showBelow
                  ? { top: -5, backgroundColor: colors.surface }
                  : { bottom: -5, backgroundColor: colors.surface },
              ]}
            />
            <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}>
              {t.scopeHintTitle}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12.5 * font,
                lineHeight: 19 * font,
                marginTop: 6 * spacing,
              }}
            >
              {t.scopeHintDesc}
            </Text>
            <View style={[styles.actions, { marginTop: 14 * spacing }]}>
              <TouchableOpacity
                onPress={onSelect}
                activeOpacity={0.8}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: 10 * radius,
                    marginRight: 10 * spacing,
                  },
                ]}
              >
                <Text style={{ color: colors.surface, fontSize: 14 * font, fontWeight: '600' }}>
                  {t.scopeHintSelect}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.7}
                style={styles.skipButton}
                accessibilityRole="button"
                accessibilityLabel={t.scopeHintSkip}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>{t.scopeHintSkip}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  bubbleWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubble: {
    width: '100%',
    maxWidth: 340,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  arrow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    height: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    height: 36,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScopeHintOverlay;
