# RhythNote V1 发布文件

版本：`0.1.0`  
平台：Windows 10/11 x64  
构建日期：2026-10-19  
GitHub Release：<https://github.com/zdkwa/RhythNote/releases/tag/v0.1.0>

## 下载

| 文件 | 用途 | 大小 |
|---|---|---|
| [RhythNote_0.1.0_x64-setup.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.0/RhythNote_0.1.0_x64-setup.exe) | NSIS 安装包，推荐普通用户使用 | 2.33 MiB |
| [RhythNote.exe](https://github.com/zdkwa/RhythNote/releases/download/v0.1.0/RhythNote.exe) | 便携版，下载后直接运行 | 6.24 MiB |

## 安装 / 运行

1. 下载 `RhythNote_0.1.0_x64-setup.exe`，双击按向导安装。
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
EA558EDB6E60F57CF3DC30F75A60838DAD7318B69936E3E51B35B263FCD466B5

RhythNote_0.1.0_x64-setup.exe
724D5B26333E53E7C6BDB072E1BA39861A387F3DC2168D9F88C9693AEB4FD466
```

## 数据位置

```text
%APPDATA%\com.rhythnote.desktop\rhythnote.db
```

卸载应用不会自动删除该数据库；如需彻底清理，请手动删除该目录。
