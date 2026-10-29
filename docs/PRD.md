# 记单词 App 产品需求文档（PRD）

> 版本：v2.1  
> 日期：2026-10-21  
> 状态：新增知识点标签功能（树状知识点 + 多对多关联题目 + 递归搜索）

---

## 一、产品概述

### 1.1 产品定位

一款面向学习者的答题应用，通过选择题等题型帮助用户高效记忆知识点，支持多学科（英语、数学等）、多种题目类型（单选/多选/判断/填空）和学习进度追踪。

### 1.2 目标用户

- 大学生（CET4/CET6 英语备考）
- 高中生（高考英语、数学等科目）
- 考研备考者
- 其他有知识记忆和刷题需求的用户

### 1.3 核心价值

- 结构化的题库体系，按年级/教材/考点分级分单元
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
│   │   │   ├── grades/           # 年级（含学段）管理
│   │   │   ├── subjects/         # 科目管理
│   │   │   ├── publishers/       # 教材版本管理
│   │   │   ├── chapters/         # 教材章节管理
│   │   │   ├── tags/             # 题目标签管理
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
│   │   │   └── seed.ts           # 初始题库数据种子
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
│   ├── 学习范围模块
│   │   ├── 年级（含学段：小学/初中/高中/大学）
│   │   ├── 科目
│   │   ├── 考纲维度：知识点树 + 题目标签
│   │   └── 教材维度：教材版本 → 章节（册/章/节）
│   ├── 首页（学习模块）
│   │   ├── 年级 + 科目选择（全局常驻）
│   │   ├── 按章节学 / 按知识点学
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
    ├── 内容管理（年级/科目/教材版本/章节/标签 CRUD、题目 CRUD、批量导入、单元划分设置）
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

### 4.2 学习范围（年级 / 科目 / 教材）

#### 4.2.1 概念说明

**学段与年级合并：** 早期设计把「学段（小学/初中/高中/大学）」与「年级（初一/高一/大一…）」拆成 Category 与 Grade 两张表，实际两者是同一层级的概念。现已合并为一张 `Grade` 表，用 `stage` 字段记录学段，年级名称唯一。题目只存 `gradeId`，不再有 `categoryId`。

**两条互相独立的归属维度：**

| 维度 | 字段 | 说明 |
|------|------|------|
| 考纲维度 | `gradeId` + `subjectId` | 面向中考/高考等考纲练习，可再叠加知识点、标签筛选 |
| 教材维度 | `chapterId` + `source = textbook` | 面向教材同步练习，章节自带年级/科目/教材版本 |

两类维度互不依赖：教材同步题手写 `chapterId`，考纲真题 `chapterId = null`，因此真题不会混入任何教材章节；章节取题也不经过知识点间接关联。

**单元划分规则：**

单元不是数据库实体，而是在「当前筛选条件命中的题目集合」上动态划分：

```
筛选条件（年级 + 科目 + 知识点? + 标签?）或（教材章节子树）
        ↓ 按 sortOrder ASC, id ASC 稳定排序
题目 1 ... 题目 N
        ↓ 每 unit_size 个一组
第 1 单元：第 1 ~ unit_size 个
第 2 单元：第 unit_size+1 ~ 2×unit_size 个
...
```

`unit_size` 是**用户级全局设置**，对所有学习范围统一生效。排序必须带 `id` 决胜键，否则并列 `sortOrder` 的行返回顺序不稳定，会导致不同接口划出的单元窗口不一致、单元进度统计错乱。

用户的学习进度基于题目维度追踪，调整 `unit_size` 不会丢失已答题目的进度。

#### 4.2.2 数据模型

**年级表（Grade）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| name | String | 年级名称（一年级 / 初一 / 高一 / 大一），唯一 |
| stage | String | 学段：小学 / 初中 / 高中 / 大学 |
| sortOrder | Int | 排序序号 |
| createdAt | DateTime | 创建时间 |

> 管理后台与移动端的年级选择器均按 `stage` 分组渲染，用户只需选一次年级即可同时确定学段。

**教材版本表（Publisher）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| name | String | 版本名称（人教版 / 苏教版 / 北师大版 / 鲁教版 / 通用），唯一 |
| createdAt | DateTime | 创建时间 |

**章节表（Chapter）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| gradeId | BigInt | 外键 → Grade |
| subjectId | BigInt | 外键 → Subject |
| publisherId | BigInt | 外键 → Publisher |
| parentId | BigInt? | 父章节 ID，null 表示册 |
| level | Int | 1=册，2=章，3=节 |
| semester | Int? | 仅 level=1 有意义：1=上，2=下，0=全一册 |
| name | String | 章节名称 |
| sortOrder | Int | 排序序号 |

> 章节为自引用树：册 → 章 → 节。章节的题目数按子树聚合（含所有后代章节）。

**题目表（Question）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| gradeId | BigInt? | 所属年级（外键 → Grade），历史数据可能为空表示不限年级 |
| subjectId | BigInt? | 所属科目（外键 → Subject） |
| chapterId | BigInt? | 教材章节（外键 → Chapter），教材同步题才有 |
| source | String | 来源：exam 真题 / textbook 教材同步 / mock 模拟 / custom 自建，默认 custom |
| type | TinyInt | 题目类型：1=单选，2=多选，3=判断，4=填空 |
| content | Text | 题干内容（如单词 "abandon"、数学题 "2x+3=7，求x"） |
| analysis | Text | 答案解析（可选） |
| difficulty | TinyInt | 难度，默认 1 |
| score | Int | 分值，默认 1 |
| sortOrder | Int | 排序序号，决定题目在单元中的位置 |
| createdAt | DateTime | 创建时间 |

> 通用设计：题目不再局限于英语单词，可覆盖任何学科。例如英语单选题题干为单词、选项为释义；数学单选题题干为算式、选项为数值。
> 题目的知识点与标签均通过中间表多对多关联，见 4.2.3。

**题目选项表（QuestionOption）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| question_id | BigInt | 外键 → Question |
| option_key | Char(1) | 选项标识：'A' / 'B' / 'C' / 'D' |
| content | Text | 选项内容 |
| is_correct | Boolean | 是否正确（1=正确，0=错误） |
| sort_no | Int | 排序序号，默认 0 |

> 单选题有且仅有 1 个 `is_correct = true` 的选项；多选题可有多个正确选项。

---

#### 4.2.3 知识点（树状结构）

**概述**

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

**数据模型**

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

> 知识点采用自引用树状结构：
> - `parentId = null` 表示顶级知识点
> - 可选关联 Subject（科目），便于按科目管理知识点体系
> - 知识点与题目是**多对多**关系（通过中间表）；题目的年级归属是单值 `gradeId`

**题目-知识点关联表（QuestionKnowledgePoint）**

| 字段 | 类型 | 说明 |
|------|------|------|
| questionId | BigInt | 外键 → Question |
| knowledgePointId | BigInt | 外键 → KnowledgePoint |

> 联合主键：`(questionId, knowledgePointId)`。一道题目可关联多个知识点，一个知识点可关联多道题目。

**题目标签表（QuestionTag）与关联表（QuestionTagLink）**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键，自增 |
| name | String | 标签名称，唯一（如「中考真题」「人教版」「基础」） |
| type | String | 用途分类：exam 考试类型 / source 题目来源 / difficulty 难度，默认 source |
| sortOrder | Int | 排序序号 |

| 字段 | 类型 | 说明 |
|------|------|------|
| questionId | BigInt | 外键 → Question |
| tagId | BigInt | 外键 → QuestionTag |

> 标签与题目同样是多对多（联合主键 `(questionId, tagId)`）。标签与年级/科目/知识点正交，移动端以横向 chips 多选方式做交叉筛选，命中任意所选标签即可。

**搜索逻辑（递归查询）**

按知识点搜索题目时，需要递归查找该知识点及其所有后代节点关联的题目：

```
搜索"函数"的题目 →
  1. 找到"函数"节点本身
  2. 递归找到所有子节点：一次函数、二次函数、三角函数
  3. 查询 QuestionKnowledgePoint 中 knowledgePointId 属于 {函数, 一次函数, 二次函数, 三角函数} 的所有题目
  4. 去重后返回
```

**实现方式：** 在 API 层通过递归获取所有后代 ID 列表，再用 `IN` 查询关联表。对于大数据量场景，可考虑使用 PostgreSQL 的 `WITH RECURSIVE` CTE 查询。

**Prisma Schema**

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
  studyRecords     UserStudyRecord[]
  questionProgress UserQuestionProgress[]

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

#### 4.3.1 首页（学习范围选择）

| 项目 | 说明 |
|------|------|
| **页面入口** | App 首页，底部 Tab 第一项 |
| **页面布局** | 顶部原生 header 左上角展示「年级 + 科目」选择器（纯文字按钮，点击进入分组选择弹层）；内容区展示科目概览卡片与快捷入口（错题本 / 学习报告 / 教材同步） |
| **年级选择** | 选项按学段（小学/初中/高中/大学）分组，选中年级即确定学段，全局生效 |
| **科目选择** | 切换年级/科目后所有页面同步刷新筛选范围 |
| **交互** | 点击科目卡片或「学习」Tab → 进入学习页；点击「教材同步」→ 进入教材版本选择 |

#### 4.3.2 学习页（单元列表页）

| 项目 | 说明 |
|------|------|
| **筛选条** | 科目必选；知识点必选（按已选科目加载知识点树）；年级与标签为可选横向筛选（标签多选，命中任意一个即可）。首页/学习页的年级+科目选择器位于原生 header，页面内不再重复展示 |
| **单元列表** | 列表展示当前筛选条件命中的题目所划分出的单元，每页 10 个，触底加载下一页。每个单元显示：单元名称（第 N 单元）、题目数量（unit_size）、学习进度（已完成/总数） |
| **单元状态标识** | 未开始（灰色）、进行中（蓝色）、已完成（绿色） |
| **交互** | 点击单元 → 拉取该单元题目并进入答题页 |
| **回归刷新** | 页面重新获得焦点时静默刷新已加载的单元列表，保证从结果页返回后进度为最新 |

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
| **历史记录** | 按日期展示学习记录，每条记录包含：日期、学习范围（年级+科目 / 教材版本·年级·章节）、单元、正确率；支持按年级、科目、知识点筛选，不选筛选条件时展示全部 |
| **错题本** | 汇总所有答错的题目，支持按年级、科目筛选，可重新练习错题 |

#### 4.4.4 设置

| 项目 | 说明 |
|------|------|
| **单元题目数（unit_size）** | 设置每个单元包含的题目数量，全局生效于所有学习范围。默认值 20，可选值如 20/30/50/100/自定义。修改后所有范围的单元划分自动重新计算 |
| **主题模式** | 亮色模式 / 暗色模式 / 跟随系统，默认"跟随系统" |

> `unit_size` 是用户级全局设置，存储在 UserSettings 中。例如设置为 100 后，初一数学（1600 题）自动划分为 16 个单元，高一数学（2000 题）自动划分为 20 个单元。

---

## 五、管理后台功能需求（Next.js Web）

管理后台由管理员通过浏览器访问，用于维护用户、内容（年级/科目/教材/题目）和学习数据。基于 Next.js App Router 实现，部署在 Vercel 上。

### 5.1 管理员认证

| 项目 | 说明 |
|------|------|
| **功能描述** | 管理员通过独立登录入口认证，与移动端用户认证隔离 |
| **认证方式** | 管理员账号 + 密码，通过 NextAuth.js Credentials Provider 实现 |
| **权限控制** | 通过 Next.js Middleware 拦截未认证请求，保护 `/dashboard/*` 路由 |
| **角色设计** | v1.0 仅设"管理员"角色；后续可扩展"内容编辑"（仅管理内容与题目）和"只读"角色 |

### 5.2 数据概览（Dashboard）

| 项目 | 说明 |
|------|------|
| **功能描述** | 管理后台首页，展示关键运营数据 |
| **展示内容** | 注册用户总数、今日新增用户、今日活跃用户、总学习次数、今日学习次数、内容覆盖量（年级数/题目数） |
| **图表** | 近 7 天用户注册趋势、近 7 天学习量趋势（折线图） |

### 5.3 用户管理

| 功能 | 说明 |
|------|------|
| **用户列表** | 分页展示所有注册用户，显示：用户名、昵称、注册时间、最近活跃时间、累计答题数 |
| **搜索** | 支持按用户名、昵称模糊搜索 |
| **用户详情** | 查看用户的学习统计、学习历史、错题记录 |
| **用户状态** | 启用/禁用用户账号（禁用后无法登录） |

### 5.4 内容管理

#### 5.4.1 年级 / 科目 / 教材 / 标签管理

| 功能 | 说明 |
|------|------|
| **年级管理** | 维护年级字典：名称、学段（小学/初中/高中/大学）、排序。年级下拉在后台各处按学段分组展示 |
| **科目管理** | 维护科目：名称、图标（Ionicons 图标名）、排序，图标与移动端共用同一套图标库 |
| **教材版本管理** | 维护版本（人教版/苏教版等）及其章节数量 |
| **章节管理** | 按年级 + 科目 + 版本维护章节树（册/章/节），支持新增、编辑、删除；列表展示该章节点及子树的题目数 |
| **标签管理** | 维护题目标签：名称、用途类型（exam/source/difficulty）、排序 |

#### 5.4.2 题目管理

| 功能 | 说明 |
|------|------|
| **题目列表** | 按科目/年级/章节/知识点/标签筛选题目，显示：题干、题目类型、年级、难度、分值、选项数量；支持题干内容模糊搜索 |
| **新增题目** | 必须选择年级（按学段分组）、选择题型，填写题干、难度、分值、答案解析；可选教材章节、标签、知识点；添加选项（A/B/C/D，标记正确答案） |
| **编辑题目** | 修改题目的所有字段和选项 |
| **删除题目** | 删除单个题目（需确认，级联删除选项） |
| **批量导入** | 支持通过 CSV/Excel 文件批量导入题目；导入时必选目标年级，行内 `grade_id` 可覆盖 |
| **批量导入格式** | CSV 列：`type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order,grade_id` |
| **correct_keys 格式** | 单选题如 `A`，多选题如 `AC`，判断题如 `A`（A=对/B=错） |

> 题目归属分两条独立维度：教材维度写 `chapterId` 并把 `source` 设为 `textbook`；考纲真题 `chapterId = null`、`source = exam`。后台表单中二者互不覆盖。

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
type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order,grade_id
1,abandon,A.放弃,B.拥抱,C.建立,D.保护,A,"abandon 意为放弃",1,1,1,13
1,ability,A.能力,B.重量,C.速度,D.温度,A,"ability 意为能力",1,1,2,13
```

**批量导入 CSV 示例（数学单选题）：**

```csv
type,content,option_a,option_b,option_c,option_d,correct_keys,analysis,difficulty,score,sort_order,grade_id
1,2x+3=7，求x,A.x=1,B.x=2,C.x=3,D.x=4,B,"2x=4，x=2",1,1,1,2
```

### 5.5 学习数据查看

| 功能 | 说明 |
|------|------|
| **学习记录列表** | 查看所有用户的学习记录，按时间倒序，显示：用户、年级/教材章节、单元、开始时间、正确率 |
| **筛选** | 按用户、年级、科目、日期范围筛选 |
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

- 学习范围基础数据（科目/年级/教材/知识点）支持本地缓存（默认 24 小时），减少重复请求
- 学习记录在联网后自动同步

---

## 七、页面清单

### 7.1 移动端页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 启动页 | /splash | App 启动引导页 |
| 登录页 | /login | 用户登录 |
| 注册页 | /register | 用户注册 |
| 首页 | /home | 年级 + 科目选择、科目概览、快捷入口（错题本 / 学习报告 / 教材同步） |
| 学习页（单元列表） | /study | 科目 + 知识点必选，年级 + 标签可选，展示动态划分的单元列表 |
| 教材同步 | /textbooks | 选择教材版本 / 年级后进入章节树 |
| 章节单元列表 | /textbooks/:chapterId/units | 某章节（含后代）下动态生成的单元列表 |
| 答题页 | /quiz | 单元答题；参数为 `gradeId + subjectId + knowledgePointId? + tagIds? + unitIndex`，或 `chapterId + unitIndex` |
| 答题结果页 | /quiz/result | 单元答题结果 |
| 我的 | /profile | 个人中心 |
| 个人信息编辑 | /profile/edit | 编辑个人信息 |
| 学习记录 | /profile/records | 学习历史记录（按年级/科目/知识点筛选） |
| 错题本 | /profile/wrong-questions | 错题汇总 |
| 知识点题目 | /knowledge-points/:id/questions | 按知识点搜索关联题目 |
| 设置 | /profile/settings | 用户设置（单元题目数、主题模式、默认教材） |

### 7.2 管理后台页面（Next.js Web）

| 页面 | 路径 | 说明 |
|------|------|------|
| 管理员登录 | /admin/login | 管理员登录页 |
| 数据概览 | /admin/dashboard | 运营数据仪表盘 |
| 用户列表 | /admin/users | 用户管理列表 |
| 用户详情 | /admin/users/:id | 单个用户学习数据 |
| 年级管理 | /admin/grades | 年级（含学段）维护 |
| 科目管理 | /admin/subjects | 科目与图标维护 |
| 教材版本管理 | /admin/publishers | 教材版本维护 |
| 章节管理 | /admin/chapters | 章节树维护（册/章/节，显示子树题目数） |
| 标签管理 | /admin/tags | 题目标签维护 |
| 题目管理 | /admin/questions?gradeId=xxx | 按年级/科目/章节/知识点筛选管理题目 |
| 题目批量导入 | /admin/questions/import | CSV/Excel 批量导入（必选目标年级） |
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
│   ├── user_id, unit_size (默认20), theme (light/dark/system，默认system), language, density
│   ├── grade_id(FK→Grade, 全局学习范围), subject_id(FK→Subject), publisher_id(FK→Publisher, 我的教材)
│
├── Admin (管理员)
│   ├── id, username, password_hash, role, created_at
│
├── Grade (年级 — 学段与年级合并，用 stage 区分学段)
│   ├── id, name(一年级/初一/高一/大一，唯一), stage(小学/初中/高中/大学), sort_order, created_at
│
├── Subject (科目)
│   ├── id, name, icon, sort_order, created_at, updated_at
│
├── Publisher (教材版本)
│   ├── id, name(人教版/苏教版/…，唯一), created_at
│
├── Chapter (教材章节 — 树状，自引用)
│   ├── id, grade_id(FK→Grade), subject_id(FK→Subject), publisher_id(FK→Publisher)
│   ├── parent_id(FK→Chapter, null=册), level(1册/2章/3节), semester(1上/2下/0全一册), name, sort_order
│
├── KnowledgePoint (知识点 — 树状结构，parent_id=null 为顶级)
│   ├── id, name, parent_id(FK→KnowledgePoint, null=顶级), subject_id(FK→Subject, 可选)
│   ├── sort_order, created_at, updated_at
│
├── QuestionTag (题目标签)
│   ├── id, name(唯一), type(exam/source/difficulty), sort_order, created_at
│
├── Question (题目 — 通用设计支持多学科)
│   ├── id, grade_id(FK→Grade, 可选), subject_id(FK→Subject, 可选), chapter_id(FK→Chapter, 可选)
│   ├── source(exam/textbook/mock/custom), type(1单选/2多选/3判断/4填空)
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
├── QuestionTagLink (题目-标签关联 — 多对多)
│   ├── question_id(FK→Question), tag_id(FK→QuestionTag)
│   └── 联合主键：(question_id, tag_id)
│
├── UserStudyRecord (学习记录 — 按单元记录)
│   ├── id, user_id, grade_id(可选), subject_id(可选), chapter_id(可选, 教材练习)
│   ├── knowledge_point_id(可选), tag_filter(标签筛选快照), unit_index
│   ├── started_at, finished_at, total_questions, correct_count, wrong_count, duration_seconds
│
├── UserQuestionProgress (题目学习进度 — 基于题目维度追踪)
│   ├── user_id, question_id, subject_id(可选), knowledge_point_id(可选)
│   ├── status (unseen/correct/wrong), last_practiced_at, correct_count, wrong_count
│
└── UserDailyStat (每日统计)
    ├── user_id, date, questions_answered, units_completed, study_duration_seconds
```

> **单元的计算方式：** 单元不是数据库实体，而是通过「筛选范围 + unit_index」动态确定。
> 考纲练习：`grade_id + subject_id + knowledge_point_id? + tag_filter?` 命中的题目按 `sort_order, id` 排序后取窗口；教材练习：`chapter_id`（含后代章节）命中的题目同理。`unit_index=2, unit_size=100` 表示第 101~200 个题目。
> 学习记录按「用户 + 范围 + 单元」唯一（服务端 upsert），同一单元重复学习只保留一条最新记录，避免正确率统计重复累加。

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
  language  String  @default("zh")      // zh | en
  density   String  @default("comfortable")

  // 全局学习范围（登录后只需选一次，所有页面共享）
  gradeId     BigInt? @map("grade_id")
  subjectId   BigInt? @map("subject_id")
  publisherId BigInt? @map("publisher_id")   // 「我的教材」教材版本

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  grade     Grade?    @relation(fields: [gradeId], references: [id])
  subject   Subject?  @relation(fields: [subjectId], references: [id])
  publisher Publisher? @relation(fields: [publisherId], references: [id])

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

// 学段与年级合并：不再有独立的 Category 表
model Grade {
  id        BigInt   @id @default(autoincrement())
  name      String   @unique                  // 一年级 / 初一 / 高一 / 大一
  stage     String                            // 小学 / 初中 / 高中 / 大学
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  questions    Question[]
  chapters     Chapter[]
  studyRecords UserStudyRecord[]
  settings     UserSettings[]

  @@map("grades")
}

model Publisher {
  id        BigInt   @id @default(autoincrement())
  name      String   @unique                  // 人教版 / 苏教版 / 北师大版 / 通用
  createdAt DateTime @default(now()) @map("created_at")

  chapters Chapter[]
  settings UserSettings[]

  @@map("publishers")
}

// 教材章节树：gradeId + subjectId + publisherId 定位一套教材
model Chapter {
  id          BigInt    @id @default(autoincrement())
  gradeId     BigInt    @map("grade_id")
  subjectId   BigInt    @map("subject_id")
  publisherId BigInt    @map("publisher_id")
  parentId    BigInt?   @map("parent_id")
  level       Int       @default(2)           // 1=册 2=章 3=节
  semester    Int?                            // 仅 level=1：1=上 2=下 0=全一册
  name        String
  sortOrder   Int       @default(0) @map("sort_order")

  grade      Grade     @relation(fields: [gradeId], references: [id])
  subject    Subject   @relation(fields: [subjectId], references: [id])
  publisher  Publisher @relation(fields: [publisherId], references: [id])
  parent     Chapter?  @relation("ChapterTree", fields: [parentId], references: [id])
  children   Chapter[] @relation("ChapterTree")

  questions    Question[]
  studyRecords UserStudyRecord[]

  @@index([gradeId, subjectId, publisherId])
  @@index([parentId])
  @@map("chapters")
}

model Question {
  id            BigInt   @id @default(autoincrement())
  gradeId       BigInt?  @map("grade_id")
  subjectId     BigInt?  @map("subject_id")
  chapterId     BigInt?  @map("chapter_id")   // 教材同步题才有
  source        String   @default("custom")   // exam | textbook | mock | custom
  type          Int                          // 1=单选, 2=多选, 3=判断, 4=填空
  content       String   @db.Text
  analysis      String?  @db.Text
  difficulty    Int      @default(1)
  score         Int      @default(1)
  sortOrder     Int      @default(0) @map("sort_order")
  createdAt     DateTime @default(now()) @map("created_at")

  grade             Grade?                @relation(fields: [gradeId], references: [id])
  subject           Subject?              @relation(fields: [subjectId], references: [id])
  chapter           Chapter?              @relation(fields: [chapterId], references: [id])
  options           QuestionOption[]
  knowledgePoints   QuestionKnowledgePoint[]
  tags              QuestionTagLink[]

  @@map("questions")
}

model QuestionTag {
  id        BigInt   @id @default(autoincrement())
  name      String   @unique
  type      String   @default("source")       // exam | source | difficulty
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  questions QuestionTagLink[]

  @@map("question_tags")
}

model QuestionTagLink {
  questionId BigInt @map("question_id")
  tagId      BigInt @map("tag_id")

  question Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)
  tag      QuestionTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([questionId, tagId])
  @@index([tagId])
  @@map("question_tag_links")
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

  questions        Question[]
  knowledgePoints  KnowledgePoint[]
  chapters         Chapter[]
  studyRecords     UserStudyRecord[]
  questionProgress UserQuestionProgress[]
  settings         UserSettings[]

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
  studyRecords     UserStudyRecord[]
  questionProgress UserQuestionProgress[]

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
  gradeId         BigInt?   @map("grade_id")     // 考纲练习的年级
  subjectId       BigInt?   @map("subject_id")
  chapterId       BigInt?   @map("chapter_id")   // 教材章节练习；考纲练习为 null
  knowledgePointId BigInt?  @map("knowledge_point_id")
  tagFilter       String?   @map("tag_filter")   // 标签筛选快照，如 "1,3"
  unitIndex       Int       @map("unit_index")
  startedAt       DateTime  @default(now()) @map("started_at")
  finishedAt      DateTime? @map("finished_at")
  totalQuestions  Int       @map("total_questions")
  correctCount    Int       @default(0) @map("correct_count")
  wrongCount      Int       @default(0) @map("wrong_count")
  durationSeconds Int       @default(0) @map("duration_seconds")

  user             User            @relation(fields: [userId], references: [id])
  grade            Grade?          @relation(fields: [gradeId], references: [id])
  subject          Subject?        @relation(fields: [subjectId], references: [id])
  chapter          Chapter?        @relation(fields: [chapterId], references: [id])
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])

  @@unique([userId, gradeId, subjectId, chapterId, knowledgePointId, tagFilter, unitIndex])
  @@map("user_study_records")
}

model UserQuestionProgress {
  userId          String    @map("user_id")
  questionId      BigInt    @map("question_id")
  subjectId       BigInt?   @map("subject_id")
  knowledgePointId BigInt?  @map("knowledge_point_id")
  status          String    @default("unseen")  // unseen | correct | wrong
  lastPracticedAt DateTime? @map("last_practiced_at")
  correctCount    Int       @default(0) @map("correct_count")
  wrongCount      Int       @default(0) @map("wrong_count")

  user             User            @relation(fields: [userId], references: [id])
  question         Question        @relation(fields: [questionId], references: [id])
  subject          Subject?        @relation(fields: [subjectId], references: [id])
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id])

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
| /api/app/settings | GET | 获取用户设置（unit_size, theme, 全局年级/科目/教材版本） |
| /api/app/settings | PUT | 更新用户设置（body: unitSize?, theme?, gradeId?, subjectId?, publisherId?） |
| /api/app/profile/avatar | PUT | 上传头像（multipart，≤5M） |

#### 学习范围相关（原「词库/分类」接口已全部移除）

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/grades | GET | 年级列表（含 stage 学段，供分组选择器使用） |
| /api/app/grades/:id/chapters | GET | 某年级下的教材章节树（按科目/版本过滤） |
| /api/app/subjects | GET | 科目列表（含图标） |
| /api/app/subjects/overview | GET | 首页科目概览（题目总量与已学比例） |
| /api/app/publishers | GET | 教材版本列表（含章节数） |
| /api/app/textbooks/availability | GET | 有教材内容的科目/版本/年级，决定移动端「教材同步」入口是否展示 |
| /api/app/tags | GET | 题目标签列表（可按科目） |
| /api/app/chapters/:id/units | GET | 教材章节（含后代）的动态单元列表（分页，每页 10 个） |
| /api/app/chapters/:id/units/:unitIndex/questions | GET | 某教材章节单元的题目列表（含选项） |
| /api/app/units | GET | 考纲练习单元列表（query: subjectId 必选，gradeId?, knowledgePointId?, tagIds?） |
| /api/app/units/:unitIndex/questions | GET | 考纲练习某单元的题目列表（含选项） |

#### 学习相关

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/app/study/start | POST | 开始学习某单元（body: unitIndex；query: subjectId, gradeId?, knowledgePointId?, tagIds?, chapterId?）；返回该单元上次完成的记录摘要 |
| /api/app/study/restart | POST | 再学一次：重置该单元已有记录后重新开始 |
| /api/app/study/submit | POST | 提交单题答题结果（question_id + selected_keys） |
| /api/app/study/finish | POST | 完成单元学习（upsert 该范围+单元唯一记录），返回成绩汇总 |
| /api/app/study/records | GET | 获取学习记录（query: page, pageSize, gradeId?, subjectId?, knowledgePointId?, chapterId?） |
| /api/app/study/stats | GET | 获取学习统计数据 |
| /api/app/study/wrong-questions | GET | 获取错题本（query: gradeId?, subjectId?） |

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
| /api/admin/dashboard | GET | 获取仪表盘数据（用户数、学习数、年级数/题目数等） |
| /api/admin/dashboard/trends | GET | 获取趋势数据（query: days=7） |

#### 用户管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/users | GET | 用户列表（query: page, pageSize, search） |
| /api/admin/users/:id | GET | 用户详情（含学习统计） |
| /api/admin/users/:id/status | PUT | 启用/禁用用户（body: status） |

#### 内容管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/admin/grades | GET/POST | 年级列表 / 新增年级（name, stage, sortOrder） |
| /api/admin/subjects | GET/POST | 科目列表 / 新增科目 |
| /api/admin/subjects/:id | PUT/DELETE | 编辑 / 删除科目 |
| /api/admin/publishers | GET/POST | 教材版本列表 / 新增版本 |
| /api/admin/chapters | GET/POST | 章节树（query: gradeId, subjectId, publisherId）/ 新增章节；返回子树题目数 |
| /api/admin/tags | GET/POST | 题目标签列表 / 新增标签 |
| /api/admin/questions | GET | 题目列表（query: gradeId, subjectId, chapterId, knowledgePointId, tagIds, content, page, pageSize） |
| /api/admin/questions | POST | 新增题目（含选项） |
| /api/admin/questions/:id | PUT | 编辑题目（含选项） |
| /api/admin/questions/:id | DELETE | 删除题目（级联删除选项） |
| /api/admin/questions/import | POST | 批量导入题目（multipart: CSV 文件 + gradeId） |
| /api/admin/questions/template | GET | 下载导入模板（表头含 grade_id） |
| /api/admin/uploads/question-image | POST | 上传题目配图 |
| /api/admin/dashboard | GET | 仪表盘数据（年级数、题目数等） |

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
| /api/admin/study-records | GET | 学习记录列表（query: userId, gradeId, subjectId, chapterId, startDate, endDate, page） |
| /api/admin/study-records/export | GET | 导出学习记录 CSV |
| /api/admin/wrong-stats | GET | 高频错题统计（query: gradeId?, subjectId?, limit） |

> 注：年级（Grade）与学段合并在同一张表，`stage` 为普通字符串（小学/初中/高中/大学），不再有 Category 及其 `parent_id = 0` 约定。

---

## 十、版本规划

| 版本 | 范围 | 说明 |
|------|------|------|
| v1.0 | 核心功能 | Next.js 管理后台（用户管理 + 内容管理）+ React Native 移动端（注册登录 + 年级/科目选择 + 单元答题 + 基础学习记录） |
| v1.1 | 增强功能 | 错题本 + 每日打卡 + 学习统计图表 + 题目批量导入 |
| v1.2 | 体验优化 | 移动端离线缓存 + 学习范围内容缓存 + 深色模式 + 数据导出 |
| v2.0 | 扩展功能 | 多种题型（拼写、听力）+ 艾宾浩斯复习 + 社交排行 + 多角色权限 |

---

## 十一、开放问题

| # | 问题 | 状态 |
|---|------|------|
| 1 | 题库数据来源：自建还是导入开源题库/真题？ | 待定 |
| 2 | 干扰选项生成策略：人工标注还是算法自动生成？ | 待定 |
| 3 | 是否需要支持第三方登录（微信、Apple ID）？ | 待定 |
| 4 | 是否需要付费题库或会员体系？ | 待定 |
| 5 | 管理后台是否需要多角色权限（编辑/只读）？v1.0 是否只做单角色？ | 待定 |
| 6 | React Native 使用 Expo 还是 bare CLI？ | 待定 |
| 7 | 是否需要管理后台的操作日志审计功能？ | 待定 |

---

## 十二、已确认决策

| # | 决策 | 说明 |
|---|------|------|
| 1 | 后端/API：Next.js | 使用 Next.js Route Handlers 提供 RESTful API，部署到 Vercel |
| 2 | 管理后台：Next.js Web | 管理员通过浏览器访问，维护用户、内容（年级/科目/教材/题目）和学习数据 |
| 3 | 移动端：React Native | 跨平台 iOS/Android，调用 Next.js API |
| 4 | 部署平台：Vercel | Next.js 应用 + API 统一部署 |
| 5 | 数据库：Supabase (PostgreSQL) | 使用 Supabase 托管 PostgreSQL，通过 Prisma ORM 连接 |
| 6 | 管理后台 UI：shadcn/ui + Tailwind CSS | 管理后台使用 shadcn/ui 组件库 + Tailwind CSS 样式 |
| 7 | 管理后台路由：React Router | 管理后台页面路由使用 React Router |
| 8 | 移动端状态管理：Redux Toolkit | 移动端使用 Redux Toolkit 管理全局状态 |
| 9 | 单元动态划分 | 单元不是数据库实体，根据用户设置中的 unit_size 动态计算。unit_size 是用户级全局设置，对所有学习范围统一生效 |
| 10 | 题目模型通用化 | 使用 Question + QuestionOption 替代原 Word + WrongOption，支持单选/多选/判断/填空，可覆盖英语、数学等多学科场景 |
| 11 | 题目数据管理 | 管理后台支持单个添加题目和 CSV/Excel 批量导入两种方式 |
| 12 | 学段与年级合并 | 删除 Category 表，Grade 表用 `stage` 字段区分学段（小学/初中/高中/大学）；用户只选一次年级，后端同时得到年级与学段 |
| 13 | 知识点采用树状结构 + 多对多关联 | KnowledgePoint 自引用树（parentId=null 为顶级），通过 QuestionKnowledgePoint 中间表与 Question 多对多关联。搜索时递归查找所有后代节点 |
| 14 | 知识点可选关联科目 | KnowledgePoint.subjectId 为可选字段，便于按科目管理知识点体系 |
| 15 | 移除分类归属维度 | 题目不再有 `categoryId`，只存 `gradeId`；学习记录与题目进度同步删除 `categoryId` 字段 |
| 16 | 双维度题目归属 | 考纲维度（gradeId + subjectId + 知识点 + 标签）与教材维度（chapterId）互相独立；教材章节取题直接命中 `Question.chapterId`，不经过知识点间接关联 |
| 17 | 题目标签多对多 | QuestionTag 通过 QuestionTagLink 与题目多对多关联，与年级/科目/知识点正交，移动端以横向 chips 做交叉筛选（命中任意标签即可） |

---

## 版本变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v2.0 | 2026-10-11 | 通用题目模型替代单词模型，支持多学科 |
| v2.1 | 2026-10-21 | 新增知识点标签功能：树状知识点数据模型、多对多关联题目、递归搜索、管理后台知识点 CRUD、移动端知识点浏览 |
| v2.2 | 2026-10-29 | 新增教材维度（教材版本 / 章节树）与题目标签；题目改为 `gradeId + chapterId + source` 双维度归属 |
| v3.0 | 2026-10-29 | 学段与年级合并：删除 Category 表及 `Question/UserStudyRecord/UserQuestionProgress` 的 `categoryId` 字段；移除全部分类接口、管理页与移动端分类筛选，学习范围统一由「年级 + 科目 + 知识点 / 标签」或「教材章节」确定 |

---

*文档结束*
