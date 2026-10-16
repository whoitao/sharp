# apps/mobile Android 本地打包修复计划

## Context

用户要求对 `apps/mobile` 执行本地 Android 打包。已完成环境准备（Java 17、expo prebuild），首次 Gradle 构建失败，根因：

1. **NDK 27.1.12297006 未安装** — React Native 0.83 New Architecture 需要，SDK 中缺失。
2. **沙箱写入限制** — 阻止了 `$ANDROID_HOME/ndk/`（NDK 安装）和 `~/Library/Application Support/kotlin/daemon/`（Kotlin daemon 临时文件）的写入。

## 已完成

- ✅ Java 17（Temurin 17.0.20.1）：`/Users/liuchangtao/.local/share/jdks/jdk-17.0.20.1+1/Contents/Home`
- ✅ `apps/mobile/android/` 原生工程已生成
- ✅ Gradle 9.0.0 已下载

## 执行步骤（不修改任何项目文件）

### 步骤 1：安装 NDK 27.1.12297006

用 sdkmanager 安装（需 `dangerouslyDisableSandbox` 写入 SDK 目录）：

```bash
export ANDROID_HOME=/Users/liuchangtao/Library/Android/sdk
$ANDROID_HOME/tools/bin/sdkmanager "ndk;27.1.12297006"
```

### 步骤 2：构建 Debug APK

```bash
cd apps/mobile/android
JAVA_HOME=/Users/liuchangtao/.local/share/jdks/jdk-17.0.20.1+1/Contents/Home \
ANDROID_HOME=/Users/liuchangtao/Library/Android/sdk \
./gradlew assembleDebug -Dkotlin.compiler.execution.strategy=in-process
```

- `-Dkotlin.compiler.execution.strategy=in-process`：Kotlin 编译器进程内执行，避免 daemon 需要在沙箱外写临时文件
- 需 `dangerouslyDisableSandbox: true`：允许 SDK / Kotlin 相关目录写入

### 步骤 3：输出 APK

产物路径：`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## 验证

- APK 文件存在且大小合理（约 30-80MB）
