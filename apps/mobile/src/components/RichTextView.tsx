import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle
} from 'react-native';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../services/api';
import { htmlToText, needsRichView } from '../utils/richText';

interface RichTextViewProps {
  /** 后台存的富文本 HTML（公式已由接口渲染成 KaTeX 结构） */
  html?: string | null;
  fontSize: number;
  color: string;
  lineHeight?: number;
  /** 外层容器样式（flex、margin 等） */
  containerStyle?: StyleProp<ViewStyle>;
  /** 纯文本模式的文本样式；富文本模式不生效 */
  style?: StyleProp<TextStyle>;
  /** 纯文本模式的行数限制；富文本模式会完整展示 */
  numberOfLines?: number;
}

/**
 * 用 WebView 渲染资源路径都指向 API 域名，避免跟随页面 baseUrl 解析。
 * 内容是后台管理员录入的，允许执行脚本以便测量高度。
 */
function buildDocument(html: string, fontSize: number, color: string, lineHeight: number): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${base}/katex/katex.min.css" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: ${color};
    font-size: ${fontSize}px;
    line-height: ${lineHeight}px;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", Arial, sans-serif;
    word-break: break-word;
  }
  p { margin: 0 0 4px; }
  p:last-child { margin-bottom: 0; }
  img { display: block; max-width: 100%; height: auto; margin: 4px 0; border-radius: 4px; }
  .katex { font-size: 1.05em; }
  .katex-display { margin: 6px 0; overflow-x: auto; overflow-y: hidden; }
  /* 表格先按内容自适应宽度；超出容器时由脚本等比缩小字号，仍放不下才回退为定宽换行 */
  table { width: auto; max-width: 100%; border-collapse: collapse; table-layout: auto; margin: 6px 0; }
  td, th {
    border: 1px solid ${color}33;
    padding: 3px 5px;
    vertical-align: top;
    white-space: nowrap;
  }
  th { font-weight: 600; }
  td p, th p { margin: 0; }
  /* 回退态：定宽铺满，允许长内容折行 */
  table.fit-fallback { width: 100% !important; table-layout: fixed; }
  table.fit-fallback td, table.fit-fallback th { white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
</style>
</head>
<body>
${html}
<script src="${base}/katex/katex.min.js"></script>
<script src="${base}/katex/auto-render.min.js"></script>
<script>
  (function () {
    // 两种公式来源都要渲染：
    // 1. 编辑器插入的数学节点只会序列化成 data-latex
    // 2. 历史导入的题目是正文里的 $...$ / $$...$$ / \\(...\\) / \\[...\\]
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\\\[', right: '\\\\]', display: true },
            { left: '\\\\(', right: '\\\\)', display: false },
          ],
          throwOnError: false,
        });
      }
    } catch (e) {}
    try {
      var mathNodes = document.querySelectorAll('[data-type="inline-math"], [data-type="block-math"]');
      for (var i = 0; i < mathNodes.length; i++) {
        var node = mathNodes[i];
        var latex = node.getAttribute('data-latex') || '';
        var displayMode = node.getAttribute('data-type') === 'block-math';
        node.innerHTML = katex.renderToString(latex, { displayMode: displayMode, throwOnError: false });
      }
    } catch (e) {}

    // 表格自适应：按内容实际宽度等比缩小字号，尽量在可视区域内完整展示；
    // 缩到最小仍放不下时，回退为定宽铺满 + 折行（避免被 WebView 裁掉）
    function fitTables() {
      var max = document.documentElement.clientWidth || 0;
      if (!max) return;
      var tables = document.querySelectorAll('table');
      for (var i = 0; i < tables.length; i++) {
        var t = tables[i];
        t.classList.remove('fit-fallback');
        t.style.fontSize = '';
        var width = t.scrollWidth;
        if (!width || width <= max) continue;
        var base = parseFloat(window.getComputedStyle(t).fontSize) || 16;
        var target = base * (max / width) * 0.98;
        t.style.fontSize = Math.max(target, base * 0.5) + 'px';
        if (t.scrollWidth > max + 1) {
          t.style.fontSize = '';
          t.classList.add('fit-fallback');
        }
      }
    }

    function send() {
      var h = document.body ? document.body.scrollHeight : 0;
      if (h > 0 && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(String(h));
      }
    }
    window.addEventListener('load', function () { fitTables(); send(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fitTables(); send(); });
    }
    setTimeout(function () { fitTables(); send(); }, 60);
    setTimeout(function () { fitTables(); send(); }, 400);
    // 图片加载、字体替换都会改变高度，用 ResizeObserver 持续同步
    if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
  })();
</script>
</body>
</html>`;
}

const RichTextView: React.FC<RichTextViewProps> = ({
  html,
  fontSize,
  color,
  lineHeight,
  containerStyle,
  style,
  numberOfLines,
}) => {
  const rich = needsRichView(html);
  const resolvedLineHeight = lineHeight ?? Math.round(fontSize * 1.5);
  const text = useMemo(() => htmlToText(html), [html]);
  const documentHtml = useMemo(
    () => (rich ? buildDocument(html || '', fontSize, color, resolvedLineHeight) : ''),
    [rich, html, fontSize, color, resolvedLineHeight]
  );

  // 富文本先给一个估算高度，测出真实高度后再收敛，避免长图把整页顶开
  const measureInitial = () =>
    rich && /<img/i.test(html || '') ? 180 : Math.ceil(resolvedLineHeight);
  const [height, setHeight] = useState(measureInitial);

  useEffect(() => {
    setHeight(rich && /<img/i.test(html || '') ? 180 : Math.ceil(resolvedLineHeight));
  }, [documentHtml, rich, html, resolvedLineHeight]);

  if (!rich) {
    return (
      <View style={containerStyle}>
        <Text style={[{ color, fontSize, lineHeight: resolvedLineHeight }, style]} numberOfLines={numberOfLines}>
          {text}
        </Text>
      </View>
    );
  }

  // react-native-webview 不支持浏览器端，web 上用 iframe srcDoc 渲染同一份文档。
  // srcDoc iframe 与页面同源，可以直接读取内容高度，无需 postMessage 通道
  if (Platform.OS === 'web') {
    return (
      <View style={containerStyle}>
        <View style={{ height, pointerEvents: 'none' }}>
          <iframe
            srcDoc={documentHtml}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
            onLoad={(e) => {
              const doc = (e.target as HTMLIFrameElement).contentDocument;
              if (!doc) return;
              const measure = () => {
                const h = doc.body ? doc.body.scrollHeight : 0;
                if (h > 0) setHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
              };
              measure();
              setTimeout(measure, 60);
              setTimeout(measure, 400);
              // 图片加载、字体替换都会改变高度，用 ResizeObserver 持续同步
              if (typeof ResizeObserver !== 'undefined' && doc.body) {
                new ResizeObserver(measure).observe(doc.body);
              }
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {/* 只做展示：禁用触摸，避免 WebView 抢走父级 ScrollView 的滚动与选项点击 */}
      <View style={{ height, pointerEvents: 'none' }}>
        <WebView
          source={{ html: documentHtml, baseUrl: API_BASE_URL }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          setBuiltInZoomControls={false}
          onMessage={(event) => {
            const next = Math.ceil(Number(event.nativeEvent.data));
            if (Number.isFinite(next) && next > 0) {
              setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
            }
          }}
          onShouldStartLoadWithRequest={(request) =>
            request.url === 'about:blank' || request.url.startsWith(API_BASE_URL)
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default RichTextView;
