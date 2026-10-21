# 记单词 App 产品需求文档（PRD）

> 版本：v2.1  
> 日期：2026-10-21  
> 状态：新增知识点标签功能（树状知识点 + 多对多关联题目 + 递归搜索）

---

## 一、产品概述

### 1.1 产品定位

一款面向学习者的答题应用，通过选择题等题型帮助用户高效记忆知识点，支持多学科（英语、数学等）分类、多种题目类型（单选/多选/判断/填空）和学习进度追踪。

### 1.2 目标用户

- 大学生（CET4/CET6 英语备考）
- 高中生（高考英语、数学等科目）
- 考研备考者
- 其他有知识记忆和刷题需求的用户

### 1.3 核心价值

- 结构化的词库体系，按教材/考试分级分单元
- 简洁的答题交互，降低学习门槛
- 学习记录追踪，量化学习成果

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                           │
│                                                     │
│  ┌──────────────────┐    ┌────────────────────────┐ │
│  │  React Native    │    │  Next.js Web（管理后台） │ │
│  │  移动端 App       │    │  管理员通过浏览器访问    │ │
│  │  (iOS/Android)   │    │                        │ │
│  └────────┬─────────┘    └───────────┬────────────┘ │
│           │                          │              │
└───────────┼──────────────────────────┼──────────────┘
            │   HTTP/REST (JSON)       │
            ▼                          ▼
┌─────────────────────────────────────────────────────┐
│                 Next.js API 层                       │
│                                                     │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ /api/auth   │ │ /api/app │ │ /api/admin       │  │
│  │ 用户认证     │ │ 用户端接口│ │ 管理后台接口      │  │
│  └─────────────┘ └──────────┘ └──────────────────┘  │
│                                                     │
│  部署平台：Vercel                                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   数据层                             │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Supabase    │  │  Redis（可选）│                 │
│  │  PostgreSQL  │  │  缓存/会话    │                 │
│  └──────────────┘  └──────────────┘                 │
│                                                     │
│  数据库托管：Supabase（Postgres + Auth + Realtime）   │
└─────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **移动端** | React Native (Expo) | 跨平台 iOS/Android，共享 React 生态 |
| **管理后台前端** | Next.js (App Router) + React + shadcn/ui + Tailwind CSS | UI 组件使用 shadcn/ui，部署到 Vercel |
| **管理后台路由** | React Router | 管理后台页面路由管理 |
| **API 层** | Next.js Route Handlers | 统一由 Next.js 提供 RESTful API |
| **数据库** | PostgreSQL (Supabase) | 关系型数据，通过 Prisma ORM 操作，Supabase 提供托管 Postgres + 实时订阅 + Auth |
| **ORM** | Prisma | 类型安全的数据库访问，与 Next.js 深度集成 |
| **认证** | NextAuth.js (Auth.js) | 支持多种认证方式，JWT Token |
| **部署** | Vercel | 前端 + API 一体化部署，自动 CI/CD |
| **状态管理（移动端）** | Redux Toolkit | 移动端全局状态管理 |
| **移动端网络请求** | Axios / React Query | API 调用与缓存管理 |

### 2.3 项目结构规划

```
word-app/
├── apps/
│   ├── admin/                    # Next.js 管理后台
│   │   ├── app/
│   │   │   ├── (auth)/           # 管理员登录
│   │   │   ├── dashboard/        # 数据概览
│   │   │   ├── users/            # 用户管理
│   │   │   ├── categories/       # 词库分类管理
│   │   │   ├── questions/        # 题目管理
│   │   │   ├── knowledge-points/ # 知识点管理
│   │   │   └── study-records/    # 学习记录查看
│   │   ├── api/                  # Next.js Route Handlers
│   │   │   ├── auth/             # 认证接口
│   │   │   ├── app/              # 移动端调用的接口
│   │   │   └── admin/            # 管理后台专用接口
│   │   ├── components/           # 管理后台组件
│   │   ├── lib/                  # 工具函数、Prisma client 等
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 数据库模型定义
│   │   │   └── seed.ts           # 初始词库数据种子
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── mobile/                   # React Native 移动端
│       ├── src/
│       │   ├── screens/          # 页面
│       │   ├── components/       # 组件
│       │   ├── navigation/       # 路由导航
│       │   ├── services/         # API 调用封装
│       │   ├── stores/           # 状态管理
│       │   └── utils/            # 工具函数
│       ├── App.tsx
│       └── package.json
│
├── packages/
│   └── shared/                   # 共享类型定义、常量
│       ├── types/
│       └── constants/
│
└── package.json                  # monorepo 根配置
```

---

## 三、功能架构

```
记单词 App
├── 移动端（React Native）
│   ├── 账号模块
│   │   ├── 注册
│   │   ├── 登录
│   │   └── 个人信息管理
│   ├── 词库模块
│   │   └── 树状词库分类（分类 → 子分类 → 叶子分类）
│   │       └── 单元（动态划分：用户设置 unit_size，全局生效于所有词库）
│   ├── 首页（学习模块）
│   │   ├── 词库选择
│   │   ├── 单元列表（动态生成）
│   │   └── 答题页面（选择题模式）
│   └── 我的模块
│       ├── 账号信息
│       ├── 学习记录/统计
│       └── 设置（单元题目数、主题模式）
│
└── 管理后台（Next.js Web）
    ├── 管理员认证
    ├── 用户管理（查看/搜索/禁用）
    ├── 词库管理（分类 CRUD、题目 CRUD、批量导入、单元划分设置）
    ├── 知识点管理（树状知识点 CRUD、题目关联知识点）
    └── 学习数据查看（统计概览、用户学习记录）
```

---

## 四、移动端功能详细需求

### 4.1 账号管理

#### 4.1.1 用户注册

| 项目 | 说明 |
|------|------|
| **功能描述** | 新用户通过手机号/邮箱注册账号 |
| **输入字段** | 用户名、密码、确认密码、手机号或邮箱 |
| **校验规则** | 用户名 2-20 字符；密码 6-20 字符，需包含字母和数字；手机号/邮箱格式校验 |
| **业务规则** | 用户名不可重复；注册成功后自动登录 |
| **异常处理** | 用户名已存在提示更换；验证码错误提示重新输入 |

#### 4.1.2 用户登录

| 项目 | 说明 |
|------|------|
| **功能描述** | 已注册用户通过账号密码登录 |
| **输入字段** | 用户名（或手机号/邮箱）、密码 |
| **业务规则** | 登录成功后跳转首页；支持"记住登录状态"（Token 有效期 7 天） |
| **异常处理** | 账号不存在提示注册；密码错误提示重试，连续 5 次错误锁定 30 分钟 |

#### 4.1.3 个人信息管理

| 项目 | 说明 |
|------|------|
| **功能描述** | 查看和修改个人账号信息 |
| **可编辑字段** | 昵称、头像、密码修改 |
| **业务规则** | 修改密码需验证原密码 |

---

### 4.2 词库分类（树状结构）

#### 4.2.1 数据结构

词库采用多级树状分类结构，**分类的最后一层（叶子分类）直接关联题目**。单元不是固定的分类层级，而是根据叶子分类下题目总数和用户设置的"每单元题目数（unit_size）"动态划分。

`unit_size` 是**用户级别的全局设置**，对所有词库统一生效。例如用户设置 unit_size=100，则初中英语（1600 词 → 16 单元）和高中英语（2000 词 → 20 单元）都按每 100 词划分。

```
分类树（数据库存储）
├── 一级分类（学科/考试大类）
│   └── 二级分类（具体考试/教材）
│       └── 叶子分类（最小分类粒度，直接关联题目）
│
单元（动态计算，不存储在数据库中）
└── 叶子分类下的题目按 sort_order 排序后，每 unit_size 个题目划分为一个单元
```

**动态划分示例（用户设置 unit_size = 100，全局生效）：**

```
初中英语（叶子分类）
├── 题目总数：1600 个
├── 动态生成单元：
│   ├── 第 1 单元：第 1~100 个题目
│   ├── 第 2 单元：第 101~200 个题目
│   ├── ...
│   └── 第 16 单元：第 1501~1600 个题目

高中英语（叶子分类）
├── 题目总数：2000 个
├── 同样按 unit_size=100 划分：
│   ├── 第 1 单元：第 1~100 个题目
│   ├── ...
│   └── 第 20 单元：第 1901~2000 个题目
```

> **关键设计：** `unit_size` 存储在用户设置（UserSettings）中，修改后所有词库的单元划分自动重新计算。用户的学习进度基于题目维度（而非单元维度）追踪，因此调整 unit_size 不会丢失已答题目的进度。

#### 4.2.2 词库数据模型

**分类表（Category）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| name | String | 分类名称（如"英语"、"数学"、"CET4"） |
| parent_id | BigInt | 父分类 ID，**顶级分类 parent_id = 0** |
| sort_order | Integer | 排序序号（题目在单元中的排列依据） |
| icon | String | 分类图标（可选） |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

> 分类表不存储 `unit_size`。单元划分由用户设置中的 `unit_size` 全局控制。
> `parent_id = 0` 表示一级分类（如"英语"、"数学"），非零值表示子分类。

**题目表（Question）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| category_id | BigInt | 所属叶子分类 ID（外键 → Category） |
| type | TinyInt | 题目类型：1=单选，2=多选，3=判断，4=填空 |
| content | String(500) | 题干内容（如单词 "abandon"、数学题 "2x+3=7，求x"） |
| analysis | String(1000) | 答案解析（可选） |
| difficulty | TinyInt | 难度，默认 1 |
| score | Int | 分值，默认 1 |
| sort_order | Int | 排序序号，决定题目在单元中的位置 |
| created_at | DateTime | 创建时间 |

> 通用设计：题目不再局限于英语单词，可覆盖任何学科。例如英语单选题题干为单词、选项为释义；数学单选题题干为算式、选项为数值。

**题目选项表（QuestionOption）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| question_id | BigInt | 外键 → Question |
| option_key | Char(1) | 选项标识：'A' / 'B' / 'C' / 'D' |
| content | String(500) | 选项内容 |
| is_correct | Boolean | 是否正确（1=正确，0=错误） |
| sort_no | Int | 排序序号，默认 0 |

> 单选题有且仅有 1 个 `is_correct = true` 的选项；多选题可有多个正确选项。

---

### 4.2.3 知识点标签（树状结构）

#### 概述

每道题目可以关联一个或多个知识点。知识点采用树状层级结构，支持按任意层级（父类或子类）搜索关联题目。

**示例：**

```
数学（科目）
├── 函数（知识点）
│   ├── 一次函数
│   ├── 二次函数
│   └── 三角函数
├── 图形
│   ├── 三角形
│   ├── 四边形
│   └── 圆形
└── 概率统计
    ├── 排列组合
    └── 概率

一道数学题可能同时关联"二次函数"和"三角形"两个知识点。
搜索"函数"时，能找到关联了"一次函数""二次函数""三角函数"的所有题目（递归搜索）。
```

#### 数据模型

**知识点表（KnowledgePoint）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| name | String | 知识点名称（如"函数"、"二次函数"） |
| parentId | BigInt? | 父知识点 ID，**null 表示顶级知识点** |
| subjectId | BigInt? | 所属科目 ID（可选，外键 → Subject），用于按科目筛选知识点 |
| sortOrder | Int | 排序序号，默认 0 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

> 与 Category 类似采用自引用树状结构，但区别在于：
> - Category 的 `parentId = 0` 表示顶级；KnowledgePoint 使用 `parentId = null` 表示顶级（更符合 Prisma 惯例）
> - KnowledgePoint 可选关联 Subject（科目），便于按科目管理知识点体系
> - 知识点与题目是**多对多**关系（通过中间表），而分类与题目是**一对多**关系

**题目-知识点关联表（QuestionKnowledgePoint）**

| 字段 | 类型 | 说明 |
|------|------|------|
| questionId | BigInt | 外键 → Question |
| knowledgePointId | BigInt | 外键 → KnowledgePoint |

> 联合主键：`(questionId, knowledgePointId)`。一道题目可关联多个知识点，一个知识点可关联多道题目。

#### 搜索逻辑（递归查询）

按知识点搜索题目时，需要递归查找该知识点及其所有后代节点关联的题目：

```
搜索"函数"的题目 →
  1. 找到"函数"节点本身
  2. 递归找到所有子节点：一次函数、二次函数、三角函数
  3. 查询 QuestionKnowledgePoint 中 knowledgePointId 属于 {函数, 一次函数, 二次函数, 三角函数} 的所有题目
  4. 去重后返回
```

**实现方式：** 在 API 层通过递归获取所有后代 ID 列表，再用 `IN` 查询关联表。对于大数据量场景，可考虑使用 PostgreSQL 的 `WITH RECURSIVE` CTE 查询。

#### Prisma Schema

```prisma
model KnowledgePoint {
  id         BigInt   @id @default(autoincrement())
  name       String
  parentId   BigInt?  @map("parent_id")
  subjectId  BigInt?  @map("subject_id")
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  parent     KnowledgePoint?  @relation("KnowledgePointTree", fields: [parentId], references: [id])
  children   KnowledgePoint[] @relation("KnowledgePointTree")
  subject    Subject?         @relation(fields: [subjectId], references: [id])
  questions  QuestionKnowledgePoint[]

  @@index([parentId])
  @@index([subjectId])
  @@map("knowledge_points")
}

model QuestionKnowledgePoint {
  questionId       BigInt         @map("question_id")
  knowledgePointId BigInt         @map("knowledge_point_id")

  question         Question       @relation(fields: [questionId], references: [id], onDelete: Cascade)
  knowledgePoint   KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)

  @@id([questionId, knowledgePointId])
  @@index([knowledgePointId])
  @@map("question_knowledge_points")
}

// Question 模型新增关联：
//   knowledgePoints QuestionKnowledgePoint[]
```

---

### 4.3 首页（学习模块）

#### 4.3.1 词库选择页

| 项目 | 说明 |
|------|------|
| **页面入口** | App 首页，底部 Tab 第一项 |
| **页面布局** | 展示所有一级分类（如"英语"、"数学"等），卡片式列表 |
| **交互** | 点击一级分类 → 进入二级分类列表；点击叶子分类 → 进入单元列表（单元根据 unit_size 动态生成） |
| **面包屑导航** | 顶部显示当前路径，如"首页 > 大学英语 > CET4"，支持点击返回上级 |

#### 4.3.2 单元列表页

| 项目 | 说明 |
|------|------|
| **页面布局** | 列表展示当前叶子分类下动态生成的所有单元。每个单元显示：单元名称（第 N 单元）、题目数量（unit_size）、学习进度（已完成/总数） |
| **单元状态标识** | 未开始（灰色）、进行中（蓝色）、已完成（绿色） |
| **交互** | 点击单元 → 进入答题页面 |

**单元列表项展示示例：**

```
┌─────────────────────────────────┐
│  第一单元                    ▶  │
│  25 个题目  |  已学 12/25       │
│  ████████░░░░░░░░  48%         │
└─────────────────────────────────┘
```

#### 4.3.3 答题页面

| 项目 | 说明 |
|------|------|
| **页面标题** | 显示当前单元名称和进度，如"第一单元 (3/25)" |
| **题目区域** | 顶部显示当前题干内容（如单词 "abandon"），单选题下方可显示辅助信息（如音标） |
| **选项区域** | 四个选项（A/B/C/D），每个选项为选项内容，其中至少一个为正确答案（单选题恰好一个） |
| **答题交互** | 点击选项后：正确 → 选项变绿，自动跳转下一题（延迟 0.5s）；错误 → 选项变红，正确答案变绿，需手动点击"下一题" |
| **进度条** | 页面顶部显示当前进度（如 3/25） |
| **结果页** | 一个单元所有题目答完后，展示本次成绩：正确数/总数、正确率、用时、错题列表 |

**答题页面布局示意：**

```
┌─────────────────────────────────┐
│  ← 第一单元        3/25         │
│  ████████░░░░░░░░░░░░░░░░░░░░  │
│                                 │
│         abandon                 │
│      /əˈbændən/                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │ A. 放弃                  │    │
│  ├─────────────────────────┤    │
│  │ B. 拥抱                  │    │
│  ├─────────────────────────┤    │
│  │ C. 建立                  │    │
│  ├─────────────────────────┤    │
│  │ D. 保护                  │    │
│  └─────────────────────────┘    │
│                                 │
│         [ 下一题 ]              │
└─────────────────────────────────┘
```

> 答题页面为通用设计。英语单词题题干显示单词+音标，选项为中文释义；数学题题干显示算式，选项为数值。由题目类型（type）和选项数据驱动渲染。

#### 4.3.4 答题结果页

| 项目 | 说明 |
|------|------|
| **成绩展示** | 正确数/总数、正确率百分比、用时 |
| **错题回顾** | 列出答错的题目，每个显示：题干、用户选择（错误）、正确答案、答案解析 |
| **操作按钮** | "再练一次"（重新答本单元）、"继续学习"（返回单元列表） |

---

### 4.4 我的模块

#### 4.4.1 账号信息区

| 项目 | 说明 |
|------|------|
| **展示内容** | 头像、昵称、用户名、注册时间 |
| **操作** | 点击可编辑个人信息、修改密码、退出登录 |

#### 4.4.2 学习统计

| 项目 | 说明 |
|------|------|
| **累计数据** | 累计学习天数、累计答题数、累计完成单元数 |
| **今日数据** | 今日答题数、今日完成单元数、今日学习时长 |
| **连续打卡** | 连续学习天数（每日至少完成 1 道题计为打卡） |

#### 4.4.3 学习记录

| 项目 | 说明 |
|------|------|
| **历史记录** | 按日期展示学习记录，每条记录包含：日期、学习单元、正确率 |
| **错题本** | 汇总所有答错的题目，支持按分类筛选，可重新练习错题 |

#### 4.4.4 设置

| 项目 | 说明 |
|------|------|
| **单元题目数（unit_size）** | 设置每个单元包含的题目数量，全局生效于所有词库。默认值 20，可选值如 20/30/50/100/自定义。修改后所有词库的单元划分自动重新计算 |
| **主题模式** | 亮色模式 / 暗色模式 / 跟随系统，默认"跟随系统" |

> `unit_size` 是用户级全局设置，存储在 UserSettings 中。例如设置为 100 后，初中英语（1600 词）自动划分为 16 个单元，高中英语（2000 词）自动划分为 20 个单元。

---

## 五、管理后台功能需求（Next.js Web）

管理后台由管理员通过浏览器访问，用于维护用户、词库和学习数据。基于 Next.js App Router 实现，部署在 Vercel 上。

### 5.1 管理员认证

| 项目 | 说明 |
|------|------|
| **功能描述** | 管理员通过独立登录入口认证，与移动端用户认证隔离 |
| **认证方式** | 管理员账号 + 密码，通过 NextAuth.js Credentials Provider 实现 |
| **权限控制** | 通过 Next.js Middleware 拦截未认证请求，保护 `/dashboard/*` 路由 |
| **角色设计** | v1.0 仅设"管理员"角色；后续可扩展"内容编辑"（仅管理词库）和"只读"角色 |

### 5.2 数据概览（Dashboard）

| 项目 | 说明 |
|------|------|
| **功能描述** | 管理后台首页，展示关键运营数据 |
| **展示内容** | 注册用户总数、今日新增用户、今日活跃用户、总学习次数、今日学习次数、词库覆盖量（分类数/题目数） |
| **图表** | 近 7 天用户注册趋势、近 7 天学习量趋势（折线图） |

### 5.3 用户管理

| 功能 | 说明 |
|------|------|
| **用户列表** | 分页展示所有注册用户，显示：用户名、昵称、注册时间、最近活跃时间、累计答题数 |
| **搜索** | 支持按用户名、昵称模糊搜索 |
| **用户详情** | 查看用户的学习统计、学习历史、错题记录 |
| **用户状态** | 启用/禁用用户账号（禁用后无法登录） |

### 5.4 词库管理

#### 5.4.1 分类管理

| 功能 | 说明 |
|------|------|
| **树状展示** | 以树形结构展示所有分类，支持展开/折叠 |
| **新增分类** | 选择父分类（或顶级），填写名称、排序序号、图标 |
| **编辑分类** | 修改名称、排序、图标 |
| **删除分类** | 删除分类及其所有子分类和关联题目（需二次确认） |
| **拖拽排序** | 支持拖拽调整分类顺序和层级 |

#### 5.4.2 题目管理

| 功能 | 说明 |
|------|------|
| **题目列表** | 按叶子分类查看题目列表，显示：题干、题目类型、难度、分值、选项数量 |
| **新增题目** | 选择所属叶子分类，选择题型，填写题干、难度、分值、答案解析，添加选项（A/B/C/D，标记正确答案） |
| **编辑题目** | 修改题目的所有字段和选项 |
| **删除题目** | 删除单个题目（需确认，级联删除选项） |
| **批量导入** | 支持通过 CSV/Excel 文件批量导入题目到指定叶子分类 |
| **批量导入格式** | CSV 列：`type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order` |
| **correct_keys 格式** | 单选题如 `A`，多选题如 `AC`，判断题如 `A`（A=对/B=错） |

#### 5.4.3 知识点管理

| 功能 | 说明 |
|------|------|
| **树状展示** | 以树形结构展示所有知识点，支持展开/折叠，可按科目筛选 |
| **新增知识点** | 选择父知识点（或顶级）、所属科目（可选），填写名称、排序 |
| **编辑知识点** | 修改名称、父级关系、所属科目、排序 |
| **删除知识点** | 删除知识点及其所有子知识点，同时清除关联的题目-知识点关系（需二次确认） |
| **拖拽排序** | 支持拖拽调整知识点顺序和层级 |
| **题目关联** | 在题目编辑界面增加知识点多选字段，支持搜索和树形选择 |

#### 5.4.4 题目-知识点关联

| 功能 | 说明 |
|------|------|
| **创建/编辑题目时选择知识点** | 在题目表单中增加"知识点"多选字段（TreeSelect 组件），支持搜索 |
| **按知识点筛选题目** | 题目列表页增加知识点筛选条件，选择某知识点后递归搜索其及子知识点关联的所有题目 |
| **批量关联** | 支持批量为多道题目添加/移除知识点标签 |

**批量导入 CSV 示例（英语单选题）：**

```csv
type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order
1,abandon,A.放弃,B.拥抱,C.建立,D.保护,A,"abandon 意为放弃",1,1,1
1,ability,A.能力,B.重量,C.速度,D.温度,A,"ability 意为能力",1,1,2
```

**批量导入 CSV 示例（数学单选题）：**

```csv
type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order
1,2x+3=7，求x,A.x=1,B.x=2,C.x=3,D.x=4,B,"2x=4，x=2",1,1,1
```

### 5.5 学习数据查看

| 功能 | 说明 |
|------|------|
| **学习记录列表** | 查看所有用户的学习记录，按时间倒序，显示：用户、单元、开始时间、正确率 |
| **筛选** | 按用户、词库、日期范围筛选 |
| **错题统计** | 查看全局高频错题 Top 20（哪些题目错误率最高） |
| **数据导出** | 支持将学习记录导出为 CSV |

---

## 六、非功能需求

### 6.1 性能要求

| 指标 | 要求 |
|------|------|
| 页面加载时间 | 首屏 < 2s，页面切换 < 500ms |
| 答题响应 | 点击选项后反馈 < 100ms |
| 并发支持 | 支持 1000 用户同时在线 |

### 6.2 兼容性要求

| 平台 | 要求 |
|------|------|
| iOS | iOS 14.0 及以上 |
| Android | Android 8.0 及以上 |
| 屏幕适配 | 支持 4.7 英寸到 6.7 英寸主流屏幕尺寸 |

### 6.3 安全要求

- 用户密码加密存储（bcrypt）
- 接口通信使用 HTTPS
- Token 认证机制，支持自动续期
- 防止暴力破解（登录失败锁定机制）

### 6.4 离线支持

- 词库数据支持本地缓存，下载后可离线学习
- 学习记录在联网后自动同步

---

## 七、页面清单

### 7.1 移动端页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 启动页 | /splash | App 启动引导页 |
| 登录页 | /login | 用户登录 |
| 注册页 | /register | 用户注册 |
| 首页-词库选择 | /home | 展示词库分类 |
| 二级分类页 | /home/category/:id | 展示子分类 |
| 单元列表页 | /home/unit-list/:categoryId | 展示某叶子分类下动态生成的单元列表 |
| 答题页 | /home/quiz/:categoryId/:unitIndex | 单元答题（categoryId + unitIndex 确定单元） |
| 答题结果页 | /home/quiz/:categoryId/:unitIndex/result | 单元答题结果 |
| 我的 | /profile | 个人中心 |
| 个人信息编辑 | /profile/edit | 编辑个人信息 |
| 学习记录 | /profile/records | 学习历史记录 |
| 错题本 | /profile/wrong-questions | 错题汇总 |
| 知识点浏览 | /knowledge-points | 按科目浏览知识点树 |
| 知识点题目 | /knowledge-points/:id/questions | 按知识点搜索关联题目 |
| 设置 | /profile/settings | 用户设置（单元题目数、主题模式） |

### 7.2 管理后台页面（Next.js Web）

| 页面 | 路径 | 说明 |
|------|------|------|
| 管理员登录 | /admin/login | 管理员登录页 |
| 数据概览 | /admin/dashboard | 运营数据仪表盘 |
| 用户列表 | /admin/users | 用户管理列表 |
| 用户详情 | /admin/users/:id | 单个用户学习数据 |
| 分类管理 | /admin/categories | 词库分类树状管理 |
| 题目管理 | /admin/questions?categoryId=xxx | 按叶子分类管理题目 |
| 题目批量导入 | /admin/questions/import | CSV/Excel 批量导入 |
| 知识点管理 | /admin/knowledge-points | 树状知识点管理（CRUD、按科目筛选） |
| 知识点题目搜索 | /admin/knowledge-points/:id/questions | 按知识点递归搜索关联题目 |
| 学习记录 | /admin/study-records | 全局学习记录查看 |
| 错题统计 | /admin/wrong-stats | 高频错题统计 |

---

## 八、数据模型概览

```
User (用户)
├── id, username, password_hash, nickname, avatar, status, created_at, updated_at
│
├── UserSettings (用户设置 — 一对一)
│   ├── user_id, unit_size (默认20), theme (light/dark/system，默认system)
│
├── Admin (管理员)
│   ├── id, username, password_hash, role, created_at
│
├── Category (分类 — 树状结构，parent_id=0 为一级分类)
│   ├── id, name, parent_id(0=顶级), sort_order, icon, created_at, updated_at
│
├── Subject (科目)
│   ├── id, name, icon, sort_order, created_at, updated_at
│
├── KnowledgePoint (知识点 — 树状结构，parent_id=null 为顶级)
│   ├── id, name, parent_id(FK→KnowledgePoint, null=顶级), subject_id(FK→Subject, 可选)
│   ├── sort_order, created_at, updated_at
│
├── Question (题目 — 关联到叶子分类，通用设计支持多学科)
│   ├── id, category_id(FK→Category), subject_id(FK→Subject, 可选), type(1单选/2多选/3判断/4填空)
│   ├── content, analysis, difficulty, score, sort_order, created_at
│
├── QuestionOption (题目选项)
│   ├── id, question_id(FK→Question), option_key(A/B/C/D)
│   ├── content, is_correct, sort_no
│
├── QuestionKnowledgePoint (题目-知识点关联 — 多对多)
│   ├── question_id(FK→Question), knowledge_point_id(FK→KnowledgePoint)
│   └── 联合主键：(question_id, knowledge_point_id)
│
├── UserWordLibrary (用户词库选择)
│   ├── user_id, library_id, selected_at
│
├── UserStudyRecord (学习记录 — 按单元记录，单元由 category_id + unit_index 确定)
│   ├── id, user_id, category_id, unit_index, started_at, finished_at
│   ├── total_questions, correct_count, wrong_count, duration_seconds
│
├── UserQuestionProgress (题目学习进度 — 基于题目维度追踪)
│   ├── user_id, question_id, category_id
│   ├── status (unseen/correct/wrong), last_practiced_at, correct_count, wrong_count
│
└── UserDailyStat (每日统计)
    ├── user_id, date, questions_answered, units_completed, study_duration_seconds
```

> **单元的计算方式：** 单元不是数据库实体，而是通过 `category_id` + `unit_index` 动态确定。
> 例如 `category_id=X, unit_index=2, unit_size=100` 表示分类 X 下第 101~200 个题目（按 sort_order 排序）。

### 8.1 Prisma Schema 要点

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String   @map("password_hash")
  nickname      String?
  avatar        String?
  status        String   @default("active")  // active | disabled
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  studyRecords    UserStudyRecord[]
  questionProgress UserQuestionProgress[]
  dailyStats      UserDailyStat[]
  settings        UserSettings?

  @@map("users")
}

model UserSettings {
  id        String  @id @default(uuid())
  userId    String  @unique @map("user_id")
  unitSize  Int     @default(20) @map("unit_size")
  theme     String  @default("system")  // light | dark | system

  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

model Admin {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String   @map("password_hash")
  role          String   @default("admin")   // admin | editor | viewer
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("admins")
}

model Category {
  id            BigInt   @id @default(autoincrement())
  name          String
  parentId      BigInt   @default(0) @map("parent_id")  // 0 = 顶级分类
  sortOrder     Int      @default(0) @map("sort_order")
  icon          String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  children      Category[] @relation("CategoryTree")
  questions     Question[]

  @@map("categories")
}

model Question {
  id            BigInt   @id @default(autoincrement())
  categoryId    BigInt   @map("category_id")
  subjectId     BigInt?  @map("subject_id")
  type          Int                          // 1=单选, 2=多选, 3=判断, 4=填空
  content       String   @db.VarChar(500)
  analysis      String?  @db.VarChar(1000)
  difficulty    Int      @default(1)
  score         Int      @default(1)
  sortOrder     Int      @default(0) @map("sort_order")
  createdAt     DateTime @default(now()) @map("created_at")

  category          Category              @relation(fields: [categoryId], references: [id])
  subject           Subject?              @relation(fields: [subjectId], references: [id])
  options           QuestionOption[]
  knowledgePoints   QuestionKnowledgePoint[]

  @@map("questions")
}

model QuestionOption {
  id            BigInt   @id @default(autoincrement())
  questionId    BigInt   @map("question_id")
  optionKey     String   @db.Char(1) @map("option_key")  // A/B/C/D
  content       String   @db.VarChar(500)
  isCorrect     Boolean  @default(false) @map("is_correct")
  sortNo        Int      @default(0) @map("sort_no")

  question      Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([questionId])
  @@map("question_options")
}

model Subject {
  id         BigInt   @id @default(autoincrement())
  name       String   @unique
  icon       String?
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  questions       Question[]
  knowledgePoints KnowledgePoint[]

  @@map("subjects")
}

model KnowledgePoint {
  id         BigInt   @id @default(autoincrement())
  name       String
  parentId   BigInt?  @map("parent_id")
  subjectId  BigInt?  @map("subject_id")
  sortOrder  Int      @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  parent     KnowledgePoint?  @relation("KnowledgePointTree", fields: [parentId], references: [id])
  children   KnowledgePoint[] @relation("KnowledgePointTree")
  subject    Subject?         @relation(fields: [subjectId], references: [id])
  questions  QuestionKnowledgePoint[]

  @@index([parentId])
  @@index([subjectId])
  @@map("knowledge_points")
}

model QuestionKnowledgePoint {
  questionId       BigInt         @map("question_id")
  knowledgePointId BigInt         @map("knowledge_point_id")

  question         Question       @relation(fields: [questionId], references: [id], onDelete: Cascade)
  knowledgePoint   KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)

  @@id([questionId, knowledgePointId])
  @@index([knowledgePointId])
  @@map("question_knowledge_points")
}

model UserStudyRecord {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  categoryId      BigInt    @map("category_id")
  unitIndex       Int       @map("unit_index")
  startedAt       DateTime  @default(now()) @map("started_at")
  finishedAt      DateTime? @map("finished_at")
  totalQuestions  Int       @map("total_questions")
  correctCount    Int       @default(0) @map("correct_count")
  wrongCount      Int       @default(0) @map("wrong_count")
  durationSeconds Int       @default(0) @map("duration_seconds")

  user            User      @relation(fields: [userId], references: [id])

  @@map("user_study_records")
}

model UserQuestionProgress {
  userId          String    @map("user_id")
  questionId      BigInt    @map("question_id")
  categoryId      BigInt    @map("category_id")
  status          String    @default("unseen")  // unseen | correct | wrong
  lastPracticedAt DateTime? @map("last_practiced_at")
  correctCount    Int       @default(0) @map("correct_count")
  wrongCount      Int       @default(0) @map("wrong_count")

  user            User      @relation(fields: [userId], references: [id])

  @@id([userId, questionId])
  @@map("user_question_progress")
}

model UserDailyStat {
  userId            String   @map("user_id")
  date              DateTime @db.Date
  questionsAnswered Int      @default(0) @map("questions_answered")
  unitsCompleted    Int      @default(0) @map("units_completed")
  studyDuration     Int      @default(0) @map("study_duration_seconds")

  user              User     @relation(fields: [userId], references: [id])

  @@id([userId, date])
  @@map("user_daily_stats")
}
```

---

## 九、接口概要

### 9.1 移动端接口（/api/app/*）

React Native 移动端调用，需用户 JWT Token 认证。

#### 认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/auth/register | POST | 用户注册 |
| /api/app/auth/login | POST | 用户登录，返回 JWT |
| /api/app/auth/refresh | POST | 刷新 Token |
| /api/app/auth/profile | GET | 获取个人信息 |
| /api/app/auth/profile | PUT | 更新个人信息 |
| /api/app/auth/password | PUT | 修改密码 |

#### 设置相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/settings | GET | 获取用户设置（unit_size, theme） |
| /api/app/settings | PUT | 更新用户设置（body: unit_size?, theme?） |

#### 词库相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/categories | GET | 获取分类列表（query: parent_id） |
| /api/app/categories/:id/units | GET | 获取某叶子分类的动态单元列表（根据当前用户的 unit_size 设置计算单元数量和进度） |
| /api/app/categories/:id/units/:unitIndex/questions | GET | 获取某单元的题目列表（含选项，按 sort_order 排列） |

#### 学习相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/study/start | POST | 开始学习某单元（body: categoryId, unitIndex） |
| /api/app/study/submit | POST | 提交单题答题结果（question_id + selected_keys） |
| /api/app/study/finish | POST | 完成单元学习，返回成绩汇总 |
| /api/app/study/records | GET | 获取学习记录（分页，query: page, pageSize） |
| /api/app/study/stats | GET | 获取学习统计数据 |
| /api/app/study/wrong-questions | GET | 获取错题本（query: category_id 筛选） |
| /api/app/study/daily | GET | 获取每日学习统计（query: days） |

#### 知识点相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/knowledge-points | GET | 获取知识点树（query: subjectId 可选筛选） |
| /api/app/knowledge-points/:id/questions | GET | 按知识点搜索题目（递归搜索，返回题目摘要列表） |

### 9.2 管理后台接口（/api/admin/*）

管理后台 Web 前端调用，需管理员 JWT Token 认证。

#### 管理员认证

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/auth/login | POST | 管理员登录 |
| /api/admin/auth/me | GET | 获取当前管理员信息 |

#### 数据概览

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/dashboard | GET | 获取仪表盘数据（用户数、学习数、词库统计等） |
| /api/admin/dashboard/trends | GET | 获取趋势数据（query: days=7） |

#### 用户管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/users | GET | 用户列表（query: page, pageSize, search） |
| /api/admin/users/:id | GET | 用户详情（含学习统计） |
| /api/admin/users/:id/status | PUT | 启用/禁用用户（body: status） |

#### 词库管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/categories | GET | 获取完整分类树 |
| /api/admin/categories | POST | 新增分类 |
| /api/admin/categories/:id | PUT | 编辑分类 |
| /api/admin/categories/:id | DELETE | 删除分类（级联删除子分类和题目） |
| /api/admin/categories/:id/sort | PUT | 调整排序（body: sortOrder） |
| /api/admin/questions | GET | 题目列表（query: categoryId, page, pageSize） |
| /api/admin/questions | POST | 新增题目（含选项） |
| /api/admin/questions/:id | PUT | 编辑题目（含选项） |
| /api/admin/questions/:id | DELETE | 删除题目（级联删除选项） |
| /api/admin/questions/import | POST | 批量导入题目（multipart: CSV 文件 + categoryId） |

#### 知识点管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/knowledge-points | GET | 获取完整知识点树（query: subjectId 可选筛选） |
| /api/admin/knowledge-points | POST | 新增知识点（body: name, parentId?, subjectId?, sortOrder?） |
| /api/admin/knowledge-points/:id | PUT | 编辑知识点（body: name?, parentId?, subjectId?, sortOrder?） |
| /api/admin/knowledge-points/:id | DELETE | 删除知识点（级联删除子知识点和关联关系） |
| /api/admin/knowledge-points/:id/questions | GET | 按知识点搜索题目（递归搜索子知识点，query: page, pageSize） |
| /api/admin/questions/:id/knowledge-points | PUT | 更新题目的知识点关联（body: knowledgePointIds: number[]） |

#### 学习数据

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/study-records | GET | 学习记录列表（query: userId, categoryId, startDate, endDate, page） |
| /api/admin/study-records/export | GET | 导出学习记录 CSV |
| /api/admin/wrong-stats | GET | 高频错题统计（query: categoryId, limit） |

> 注：Category 的 parent_id 使用 BigInt，**parent_id = 0 表示一级分类**。

---

## 十、版本规划

| 版本 | 范围 | 说明 |
|------|------|------|
| v1.0 | 核心功能 | Next.js 管理后台（用户管理 + 词库 CRUD）+ React Native 移动端（注册登录 + 词库浏览 + 答题 + 基础学习记录） |
| v1.1 | 增强功能 | 错题本 + 每日打卡 + 学习统计图表 + 题目批量导入 |
| v1.2 | 体验优化 | 移动端离线缓存 + 词库下载管理 + 深色模式 + 数据导出 |
| v2.0 | 扩展功能 | 多种题型（拼写、听力）+ 艾宾浩斯复习 + 社交排行 + 多角色权限 |

---

## 十一、开放问题

| # | 问题 | 状态 |
|---|------|------|
| 1 | 词库数据来源：自建还是导入开源词库？ | 待定 |
| 2 | 干扰选项生成策略：人工标注还是算法自动生成？ | 待定 |
| 3 | 是否需要支持第三方登录（微信、Apple ID）？ | 待定 |
| 4 | 是否需要付费词库或会员体系？ | 待定 |
| 5 | 管理后台是否需要多角色权限（编辑/只读）？v1.0 是否只做单角色？ | 待定 |
| 6 | React Native 使用 Expo 还是 bare CLI？ | 待定 |
| 7 | 是否需要管理后台的操作日志审计功能？ | 待定 |

---

## 十二、已确认决策

| # | 决策 | 说明 |
|---|------|------|
| 1 | 后端/API：Next.js | 使用 Next.js Route Handlers 提供 RESTful API，部署到 Vercel |
| 2 | 管理后台：Next.js Web | 管理员通过浏览器访问，维护用户、词库和学习数据 |
| 3 | 移动端：React Native | 跨平台 iOS/Android，调用 Next.js API |
| 4 | 部署平台：Vercel | Next.js 应用 + API 统一部署 |
| 5 | 数据库：Supabase (PostgreSQL) | 使用 Supabase 托管 PostgreSQL，通过 Prisma ORM 连接 |
| 6 | 管理后台 UI：shadcn/ui + Tailwind CSS | 管理后台使用 shadcn/ui 组件库 + Tailwind CSS 样式 |
| 7 | 管理后台路由：React Router | 管理后台页面路由使用 React Router |
| 8 | 移动端状态管理：Redux Toolkit | 移动端使用 Redux Toolkit 管理全局状态 |
| 9 | 单元动态划分 | 单元不是数据库实体，根据用户设置中的 unit_size 动态计算。unit_size 是用户级全局设置，对所有词库统一生效 |
| 10 | 题目模型通用化 | 使用 Question + QuestionOption 替代原 Word + WrongOption，支持单选/多选/判断/填空，可覆盖英语、数学等多学科场景 |
| 11 | 词库数据管理 | 管理后台支持单个添加题目和 CSV/Excel 批量导入两种方式 |
| 12 | Category.parent_id = 0 表示一级分类 | 顶级分类的 parent_id 为 0（非 null） |
| 13 | 知识点采用树状结构 + 多对多关联 | KnowledgePoint 自引用树（parentId=null 为顶级），通过 QuestionKnowledgePoint 中间表与 Question 多对多关联。搜索时递归查找所有后代节点 |
| 14 | 知识点可选关联科目 | KnowledgePoint.subjectId 为可选字段，便于按科目管理知识点体系 |

---

## 版本变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v2.0 | 2026-10-11 | 通用题目模型替代单词模型，支持多学科 |
| v2.1 | 2026-10-21 | 新增知识点标签功能：树状知识点数据模型、多对多关联题目、递归搜索、管理后台知识点 CRUD、移动端知识点浏览 |

---

*文档结束*
