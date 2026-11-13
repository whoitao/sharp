import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../services/api';

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface FeedbackRichEditorHandle {
  /** 取当前正文 HTML（提交前调用） */
  getHtml: () => Promise<string>;
  focus: () => void;
}

interface FeedbackRichEditorProps {
  onChange: (html: string) => void;
  height?: number;
}

type ToolKey = 'bold' | 'italic' | 'underline' | 'strike' | 'bullet' | 'ordered';

const NATIVE_TOOL_ICON: Record<ToolKey, React.ComponentProps<typeof MaterialIcons>['name']> = {
  bold: 'format-bold',
  italic: 'format-italic',
  underline: 'format-underlined',
  strike: 'strikethrough-s',
  bullet: 'format-list-bulleted',
  ordered: 'format-list-numbered',
};

const COMMANDS: Record<ToolKey, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikeThrough',
  bullet: 'insertUnorderedList',
  ordered: 'insertOrderedList',
};

/**
 * 轻量富文本编辑器：正文仍走 WebView，但只加载本文件生成的 contenteditable 文档，
 * 不依赖 TipTap 之类的运行时包（避免 CDN/离线与体积问题）。
 * 输出标签限定在服务端 sanitize-html 白名单内（p/br/b/i/u/s/ul/ol/li/img），
 * 图片只能由原生侧调用 /api/app/feedback/upload 后回填，粘贴一律降级为纯文本。
 */
function buildDocument(options: {
  color: string;
  fontSize: number;
  placeholder: string;
  nonce: string;
}): string {
  const { color, fontSize, placeholder, nonce } = options;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src https: http: data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: var(--editor-color, ${color});
    font-size: var(--editor-font-size, ${fontSize}px);
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", Arial, sans-serif;
    -webkit-user-select: text;
    user-select: text;
    word-break: break-word;
  }
  #editor {
    min-height: 100vh;
    box-sizing: border-box;
    padding: 10px 12px;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  #editor:empty::before {
    content: attr(data-placeholder);
    color: #9aa0a6;
    pointer-events: none;
  }
  #editor p { margin: 0 0 8px; }
  #editor p:last-child { margin-bottom: 0; }
  #editor ul { list-style: disc; padding-left: 22px; margin: 6px 0; }
  #editor ol { list-style: decimal; padding-left: 22px; margin: 6px 0; }
  #editor img { display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 6px 0; }
</style>
</head>
<body>
<div id="editor" contenteditable="true" data-placeholder="${placeholder}"></div>
<script nonce="${nonce}">
(function () {
  var editor = document.getElementById('editor');
  var savedRange = null;
  var lastHtml = null;

  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}

  // Android 的 strikeThrough 会产出 <strike>，服务端白名单只认 <s>，统一转换
  function normalize() {
    var strikes = editor.querySelectorAll('strike');
    for (var i = 0; i < strikes.length; i++) {
      var node = strikes[i];
      var replacement = document.createElement('s');
      replacement.innerHTML = node.innerHTML;
      node.parentNode.replaceChild(replacement, node);
    }
  }

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function send() {
    normalize();
    var html = editor.innerHTML;
    if (html === lastHtml) return;
    lastHtml = html;
    post({ type: 'change', html: html });
  }

  function restoreSelection() {
    if (!savedRange) return false;
    var sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return true;
  }

  function placeCaretAtEnd() {
    var range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    var sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  window.__sharpEditor = {
    exec: function (command) {
      editor.focus();
      restoreSelection();
      try { document.execCommand(command, false, null); } catch (e) {}
      savedRange = null;
      send();
    },
    saveSelection: function () {
      var sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
    },
    insertImage: function (url) {
      editor.focus();
      if (!restoreSelection()) placeCaretAtEnd();
      try { document.execCommand('insertHTML', false, '<img src="' + url + '" />'); } catch (e) {}
      savedRange = null;
      send();
    },
    getHtml: function () {
      normalize();
      return editor.innerHTML;
    }
  };

  editor.addEventListener('input', send);
  // 粘贴统一降级为纯文本：避免把外链图片/脚本带进正文（服务端会整单拒绝外链图）
  editor.addEventListener('paste', function (event) {
    event.preventDefault();
    var text = '';
    if (event.clipboardData && event.clipboardData.getData) {
      text = event.clipboardData.getData('text/plain');
    }
    try { document.execCommand('insertText', false, text); } catch (e) {}
    send();
  });
  editor.addEventListener('drop', function (event) { event.preventDefault(); });
})();
</script>
</body>
</html>`;
}

function plainTextToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escape(block).replace(/\n/g, '<br />')}</p>`);
  return paragraphs.join('');
}

const FeedbackRichEditor = forwardRef<FeedbackRichEditorHandle, FeedbackRichEditorProps>(
  ({ onChange, height }, ref) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const webRef = useRef<WebView>(null);
    const htmlRef = useRef('');
    const pendingResolveRef = useRef<((html: string) => void) | null>(null);
    const [uploading, setUploading] = useState(false);
    const [webText, setWebText] = useState('');
    const [ready, setReady] = useState(false);

    const fontSize = 15;
    const placeholder = t.feedbackContentPlaceholder;

    // 文档只在挂载时生成一次，避免主题/字体变化触发 WebView 重载导致内容丢失
    const documentHtml = useMemo(() => {
      const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      return buildDocument({
        color: colors.text,
        fontSize,
        placeholder: placeholder.replace(/"/g, '&quot;'),
        nonce,
      });
    }, []);

    const inject = useCallback((code: string) => {
      webRef.current?.injectJavaScript(`${code}; true;`);
    }, []);

    const applyCommand = useCallback(
      (tool: ToolKey) => {
        inject(`window.__sharpEditor.exec(${JSON.stringify(COMMANDS[tool])})`);
      },
      [inject],
    );

    const saveSelection = useCallback(() => {
      inject('window.__sharpEditor.saveSelection()');
    }, [inject]);

    const countImages = (html: string) => (html.match(/<img\b/gi) ?? []).length;

    const pickAndUpload = useCallback(async () => {
      if (uploading) return;
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.avatarPermission);
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });
      if (picked.canceled || picked.assets.length === 0) return;

      const asset = picked.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        Alert.alert(t.feedbackImageTooLarge);
        return;
      }
      if (countImages(htmlRef.current) >= MAX_IMAGES) {
        Alert.alert(t.feedbackImageTooMany);
        return;
      }

      const fileName = asset.fileName ?? `feedback-${Date.now()}.jpg`;
      const mimeType =
        asset.mimeType ??
        (/\.png$/i.test(fileName)
          ? 'image/png'
          : /\.webp$/i.test(fileName)
            ? 'image/webp'
            : 'image/jpeg');

      setUploading(true);
      try {
        const result = await api.uploadFeedbackImage({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
        inject(`window.__sharpEditor.insertImage(${JSON.stringify(result.url)})`);
      } catch (err) {
        Alert.alert(
          err instanceof Error && err.message ? err.message : t.feedbackUploadFailed,
        );
      } finally {
        setUploading(false);
      }
    }, [inject, t, uploading]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (Platform.OS === 'web') return;
          inject('document.getElementById("editor").focus()');
        },
        getHtml: () => {
          if (Platform.OS === 'web') {
            return Promise.resolve(plainTextToHtml(webText));
          }
          return new Promise<string>((resolve) => {
            if (!ready) {
              resolve(htmlRef.current);
              return;
            }
            let settled = false;
            const finish = (html: string) => {
              if (settled) return;
              settled = true;
              pendingResolveRef.current = null;
              resolve(html);
            };
            pendingResolveRef.current = finish;
            inject(
              'window.ReactNativeWebView.postMessage(JSON.stringify({type:"html",html:window.__sharpEditor.getHtml()}))',
            );
            // WebView 无响应（被回收/加载中）时退回最近一次 change 的内容
            setTimeout(() => finish(htmlRef.current), 1200);
          });
        },
      }),
      [inject, ready, webText],
    );

    const onMessage = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        try {
          const payload = JSON.parse(event.nativeEvent.data) as {
            type?: string;
            html?: string;
          };
          if (typeof payload.html !== 'string') return;
          htmlRef.current = payload.html;
          if (payload.type === 'html') {
            pendingResolveRef.current?.(payload.html);
          } else {
            onChange(payload.html);
          }
        } catch {
          // 非本编辑器协议的消息直接忽略
        }
      },
      [onChange],
    );

    const borderStyle = {
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
    };

    if (Platform.OS === 'web') {
      return (
        <View style={[styles.container, borderStyle, { height }]}>
          <TextInput
            multiline
            value={webText}
            onChangeText={(value) => {
              setWebText(value);
              onChange(plainTextToHtml(value));
            }}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            style={[styles.webInput, { color: colors.text, fontSize }]}
          />
        </View>
      );
    }

    return (
      <View style={[styles.container, borderStyle, { height }]}>
        <View style={[styles.toolbar, { borderBottomColor: colors.borderLight }]}>
          {(Object.keys(COMMANDS) as ToolKey[]).map((tool) => (
            <TouchableOpacity
              key={tool}
              onPressIn={saveSelection}
              onPress={() => applyCommand(tool)}
              style={styles.toolButton}
              activeOpacity={0.6}
              accessibilityRole="button"
            >
              <MaterialIcons name={NATIVE_TOOL_ICON[tool]} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity
            onPressIn={saveSelection}
            onPress={() => void pickAndUpload()}
            disabled={uploading}
            style={styles.imageButton}
            activeOpacity={0.6}
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <MaterialIcons name="image" size={20} color={colors.accent} />
                <Text style={[styles.imageLabel, { color: colors.accentStrong, fontSize: 12 }]}>
                  {t.feedbackInsertImage}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <WebView
          ref={webRef}
          source={{ html: documentHtml }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          scrollEnabled
          nestedScrollEnabled
          setBuiltInZoomControls={false}
          onMessage={onMessage}
          onLoadEnd={() => setReady(true)}
          // 编辑区只允许空白文档与 https 图片资源，禁止任何外部跳转
          onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
        />
      </View>
    );
  },
);

FeedbackRichEditor.displayName = 'FeedbackRichEditor';

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  toolButton: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    marginHorizontal: 6,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 6,
  },
  imageLabel: {
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
});

export default FeedbackRichEditor;
