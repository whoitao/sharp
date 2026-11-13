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
  /** 选择器胶囊在窗口中的位置；null 时降级为「不挖洞 + 气泡居中」 */
  targetRect: ScopeCapsuleRect | null;
  /** 点击「去选择」或高亮区 */
  onSelect: () => void;
  /** 点击「跳过」或遮罩空白处 */
  onDismiss: () => void;
}

const RING_GAP_X = 10;
// 纵向外扩比横向小：再大就会越过 header 下沿，压到首页第一张卡片
const RING_GAP_Y = 6;
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

  // 只有拿到校正过、且落在安全区内的矩形才挖洞；否则不画框
  const ring = useMemo(() => {
    if (!targetRect) return null;
    const rectWidth = Math.min(Math.max(targetRect.width, 40), Math.max(40, width - 16));
    const rectHeight = Math.min(Math.max(targetRect.height, 20), Math.max(20, height - 16));
    const ringWidth = Math.min(width, rectWidth + RING_GAP_X * 2);
    const ringX = Math.max(0, Math.min(targetRect.x - RING_GAP_X, width - ringWidth));
    // 纵向先把上下沿各自 clamp 在安全区内，再算高度：框不会被刘海切掉，也不会顶到屏幕外
    const top = Math.max(insets.top, targetRect.y - RING_GAP_Y);
    const bottom = Math.min(
      height - insets.bottom - 8,
      targetRect.y + rectHeight + RING_GAP_Y,
    );
    return {
      x: ringX,
      y: top,
      width: ringWidth,
      height: Math.max(rectHeight, bottom - top),
    };
  }, [targetRect, width, height, insets.top, insets.bottom]);

  const ringBottom = ring ? ring.y + ring.height : 0;
  // 圆角随框高收敛，避免矮框出现「胶囊化」的圆弧失真
  const ringRadius = ring ? Math.min(RING_RADIUS, ring.height / 2) : RING_RADIUS;
  // 气泡优先放高亮框下方；横屏/小屏放不下时翻到上方，避免超出屏幕
  const showBelow = ring ? ringBottom + 200 <= height - insets.bottom : false;
  const bubbleSpace = ring
    ? showBelow
      ? { top: ringBottom + 28 }
      : { bottom: height - ring.y + 28 }
    : null;

  const bubble = (
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
      {ring ? (
        <View
          style={[
            styles.arrow,
            showBelow
              ? { top: -5, backgroundColor: colors.surface }
              : { bottom: -5, backgroundColor: colors.surface },
          ]}
        />
      ) : null}
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
  );

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
        {ring ? (
          <>
            {/* 四块遮罩围出挖洞，点击任意遮罩区域视为跳过 */}
            <Pressable
              onPress={onDismiss}
              style={[
                styles.dim,
                { backgroundColor: colors.overlay, left: 0, top: 0, width, height: ring.y },
              ]}
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
                  top: ring.y,
                  width: Math.max(0, ring.x),
                  height: ring.height,
                },
              ]}
            />
            <Pressable
              onPress={onDismiss}
              style={[
                styles.dim,
                {
                  backgroundColor: colors.overlay,
                  left: ring.x + ring.width,
                  top: ring.y,
                  width: Math.max(0, width - ring.x - ring.width),
                  height: ring.height,
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
                left: ring.x,
                top: ring.y,
                width: ring.width,
                height: ring.height,
                borderWidth: 2,
                borderColor: colors.accent,
                borderRadius: ringRadius,
                backgroundColor: 'transparent',
              }}
            />

            <View style={[styles.bubbleWrap, { left: 24, right: 24 }, bubbleSpace]}>
              {bubble}
            </View>
          </>
        ) : (
          <>
            {/* 测量不可用：整屏遮罩 + 气泡居中，不画可能错位的高亮框 */}
            <Pressable
              onPress={onDismiss}
              style={[
                styles.dim,
                { backgroundColor: colors.overlay, left: 0, top: 0, width, height },
              ]}
            />
            <View style={styles.centerWrap}>{bubble}</View>
          </>
        )}
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
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
