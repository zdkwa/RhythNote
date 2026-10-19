# RhythNote V1 发布文件

版本：`0.1.1`
平台：Windows 10/11 x64
构建日期：2026-10-19
GitHub Release：<https://github.com/zdkwa/RhythNote/releases/tag/v0.1.1>

> `0.1.1` 包含首页仪表板、当前时段统计、临时任务排序、逾期宽限与完成按钮调整。

## 下载

| 文件 | 用途 | 大小 |
|---|---|---|
| [RhythNote_0.1.1_x64-setup.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.1/RhythNote_0.1.1_x64-setup.exe) | NSIS 安装包，推荐普通用户使用 | 2.33 MiB |
| [RhythNote.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.1/RhythNote.exe) | 便携版，下载后直接运行 | 6.25 MiB |

## 安装 / 运行

1. 下载 `RhythNote_0.1.1_x64-setup.exe`，双击按向导安装。
2. 安装包未做代码签名，若 Windows SmartScreen 提示，选择“更多信息 → 仍要运行”。
3. 也可以直接运行便携版 `RhythNote.exe`，无需安装。

## Windows 运行要求

请使用**标准用户**运行，或对内置 Administrator 开启 UAC 管理员批准模式后重启。不要使用高完整性管理员令牌直接运行，否则 WebView2 会创建失败（闪退，异常代码 `0xc0000409`）。

```powershell
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" /v FilterAdministratorToken /t REG_DWORD /d 1 /f
```

若启动失败，请查看 `%TEMP%\RhythNote-crash.log`。

## SHA256

```text
RhythNote.exe
B73AE23C275E09887121176E686DCA1F83B852E67E112AC22ABE0FE63CADE0F0

RhythNote_0.1.1_x64-setup.exe
7EF501BEA8EA947429C53092E68E92A6C6A1AE84B467AADDE24C1759DE1EF0CC
```

## 数据位置

```text
%APPDATA%\com.rhythnote.desktop\rhythnote.db
```

卸载应用不会自动删除该数据库；如需彻底清理，请手动删除该目录。
