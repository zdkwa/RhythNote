# RhythNote · 节律待办

> 用规则描述重复，用记录保存事实。一个本地优先的个人任务待办 Windows 桌面应用。

## 项目状态

开发中（WIP）。当前已落地 Tauri 2 + React + TypeScript 工程骨架、SQLite 迁移、Repository 数据层、循环规则/日期领域逻辑、应用壳与基础 UI；任务 CRUD、月历与日期详情正在并行实现。

## 技术栈

- 桌面：Tauri 2 + Rust
- 前端：React 18 + TypeScript + Vite
- 样式：Tailwind CSS 3.4 + shadcn/ui 风格组件
- 数据：SQLite（tauri-plugin-sql）
- 循环：rrule
- 日期：date-fns
- 状态：TanStack Query

## 核心设计

- **规则与记录分离**：循环任务只保存定义与 RRULE，发生实例运行时展开，绝不预生成。
- **稀疏每日记录**：只有打卡、备注、补做等用户交互才写 `daily_records`。
- **按日暂停**：暂停必须绑定具体日期，不支持无限期暂停。
- **归档只读**：归档隐藏任务并停止新记录，历史记录与备注永久保留；V1 不支持恢复。
- **本地日期**：业务日期统一 `YYYY-MM-DD`，审计时间戳使用 UTC。

完整产品需求与技术规格见 [RhythNote-节律待办-PRD.md](RhythNote-节律待办-PRD.md)。

## 开发

需要 Node.js、pnpm、Rust（MSVC toolchain）与 WebView2。

```bash
pnpm install
pnpm dev            # 浏览器预览（使用内存演示数据）
pnpm typecheck
pnpm build
pnpm tauri dev      # 桌面开发模式（使用本地 SQLite）
```

## 目录

```text
src/
  app/          # 路由、QueryClient、错误边界
  components/   # 布局与 shadcn 风格 UI
  data/         # SQLite 客户端、Repository、查询 hooks
  domain/       # 日期展开、状态合并、排序
  features/     # 日历、任务、记录、设置
  hooks/        # 今天、时钟、主题
  lib/          # 日期、RRULE、工具
  pages/        # 页面
  types/        # 领域类型
src-tauri/
  migrations/   # SQLite schema 与 seed
  src/          # Tauri 插件注册与迁移
```

## License

Private project. All rights reserved.
