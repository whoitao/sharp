# Sharp

面向 K12 与备考场景的答题学习产品：结构化题库 + 按章节/知识点练习 + 学习记录与排行 + 养成式宠物激励。同一套后端支撑 Web、移动端与后台三端。

## 仓库结构

```
sharp/
├── apps/
│   ├── admin/     Next.js 后台 + 面向 App 的 API
│   ├── mobile/    Expo 客户端（iOS / Android / Web）
│   └── web/       Next.js 用户站
├── packages/
│   └── shared/    共用类型与常量（@sharp/shared）
├── docs/          PRD、设计说明、截图与专项方案
├── app.json       空壳占位；实际 Expo 配置在 apps/mobile/app.json
└── eas.json       构建 profile；移动端构建实际读取 apps/mobile/eas.json
```

## 移动端构建

```bash
cd apps/mobile
npx expo run:ios            # 或 pnpm ios
npx expo run:android        # 或 pnpm android
eas build --platform android --profile preview   # development / preview / production
```

## 验证

当前仓库没有自动化测试套件，改动以类型检查为准：

```bash
cd apps/admin  && pnpm exec tsc --noEmit
cd apps/web    && pnpm exec tsc --noEmit
cd apps/mobile && pnpm exec tsc --noEmit
cd packages/shared && pnpm typecheck
```

## 相关文档

- [docs/PRD.md](file:///Users/liuchangtao/Projects/whoitao/github/sharp/docs/PRD.md) — 产品需求与整体架构
- [docs/account-and-settings.md](file:///Users/liuchangtao/Projects/whoitao/github/sharp/docs/account-and-settings.md) — 账号与设置
- [docs/subject-stage-filtering-plan.md](file:///Users/liuchangtao/Projects/whoitao/github/sharp/docs/subject-stage-filtering-plan.md) — 学科 / 学段筛选
- [docs/first-login-scope-hint-plan.md](file:///Users/liuchangtao/Projects/whoitao/github/sharp/docs/first-login-scope-hint-plan.md) — 首次登录教材选择引导
- [apps/mobile/README.md](file:///Users/liuchangtao/Projects/whoitao/github/sharp/apps/mobile/README.md) — 移动端目录结构
