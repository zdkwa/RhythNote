# RhythNote · 节律待办

> 用规则描述重复，用记录保存事实。一个本地优先的个人任务待办 Windows 桌面应用。

![RhythNote 月历](docs/screenshots/home.png)

## 项目状态

V1 功能实现完成：Tauri 2 工程、SQLite 迁移与 Repository、任务 CRUD、循环规则构建器、月历、日期详情、每日记录、备注、补做、按日暂停、筛选、归档与设置均已落地，并通过 `typecheck`、单元测试、Vite 构建与 Tauri NSIS 打包验证。

## 下载

| 文件 | 说明 |
|---|---|
| [RhythNote_0.1.0_x64-setup.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.0/RhythNote_0.1.0_x64-setup.exe) | Windows x64 NSIS 安装包，推荐 |
| [RhythNote.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.0/RhythNote.exe) | 便携版，直接运行 |
| [GitHub Release v0.1.0](https://github.com/zdkwa/RhythNote/releases/tag/v0.1.0) | 版本发布页与校验信息 |

## 功能

- **首页月历**：固定 6×7 网格、周一开始、完成进度、四色状态、悬停提示、月份 URL 同步。
- **日期详情**：未完成 / 已完成 / 已暂停 / 历史记录分区；当天完成、过去补做、未来只读。
- **任务定义**：临时与循环任务，高/中/低优先级，计划/截止语义，可选时间段。
- **循环规则**：每天、工作日、每周多选、每月几号、每年；永不结束/至日期/共 N 次；高级 RRULE。
- **每日备注**：循环任务卡片下方内联编辑，500ms 防抖 + 失焦保存，失败可重试。
- **按日暂停**：只暂停具体某一天，不修改 RRULE，不写每日记录。
- **归档**：隐藏任务、停止新记录、保留历史；V1 单向不可恢复。
- **分类 / 标签 / 主题**：预置分类可增删改，标签自由创建，浅色/深色/跟随系统。
- **完全本地**：无账号、无网络请求、无遥测。

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
- **归档只读**：归档隐藏任务并停止新记录，历史记录与备注永久保留。
- **本地日期**：业务日期统一 `YYYY-MM-DD`，审计时间戳使用 UTC。

完整产品需求与技术规格见 [RhythNote-节律待办-PRD.md](RhythNote-节律待办-PRD.md)。

## 开发

需要 Node.js、pnpm、Rust（MSVC toolchain）与 WebView2。

```bash
pnpm install
pnpm dev            # 浏览器预览（使用内存演示数据）
pnpm typecheck
pnpm test
pnpm build
pnpm tauri dev      # 桌面开发模式（使用本地 SQLite）
pnpm tauri build    # 生成 Windows NSIS 安装包
```

SQLite 数据库由 tauri-plugin-sql 放在应用配置目录，Windows 下通常为：

```text
%APPDATA%\com.rhythnote.desktop\rhythnote.db
```

## 目录

```text
src/
  app/          # 路由、QueryClient、错误边界
  components/   # 布局与 shadcn 风格 UI
  data/         # SQLite 客户端、Repository、查询 hooks
  domain/       # 循环展开、状态合并、排序
  features/     # 日历、任务、记录、设置
  hooks/        # 今天、时钟、主题
  lib/          # 日期、RRULE、工具
  pages/        # 页面
  types/        # 领域类型
src-tauri/
  migrations/   # SQLite schema 与 seed
  src/          # Tauri 插件注册与迁移
docs/
  screenshots/  # 界面截图
```

## 截图

| 日期详情 | 循环规则编辑器 |
|---|---|
| ![日期详情](docs/screenshots/day.png) | ![循环规则编辑器](docs/screenshots/editor.png) |

## License

Private project. All rights reserved.
