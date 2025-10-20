# ChinaTelecom-Cookie

Quantumult X + BoxJS 自动抓取并管理中国电信 Cookie（SSON），支持定时检测与可视化。

**生成时间：2025-10-20T04:20:55.916837Z**

## 包含文件
- `ChinaTeleCom.cookie.js` — 重写脚本（script-request-header），用于抓取请求头 Cookie 并写入 $prefs
- `ChinaTeleCom.check.js` — 定时检测脚本（task_local），每日检测 Cookie 有效性并通知（可选尝试触发 loginUrl）
- `ChinaTeleCom.refresh_on_demand.js` — 可选：主动访问 loginUrl 以触发刷新（手动或定时）
- `ChinaTeleCom_Cookie.qx` — 可导入的 Quantumult X 配置片段（rewrite / task / mitm）
- `BoxJS.json` — BoxJS 面板配置（导入后显示 Cookie 与更新时间）
- `README.md` — 使用说明（你正在阅读）
- `.gitignore` — 推荐忽略规则
- `LICENSE` — MIT 许可证

## 快速安装（推荐）
1. 将仓库内容上传到 GitHub（详见下方「上传到 GitHub」部分）。
2. 在 iPhone 上：
   - 在 Quantumult X 中导入 `ChinaTeleCom_Cookie.qx`（或手动将 rewrite/task/mitm 配置粘贴到 QX 配置）。
   - 将 `ChinaTeleCom.cookie.js`, `ChinaTeleCom.check.js`, `ChinaTeleCom.refresh_on_demand.js` 放到 QX 的 Scripts 文件夹（或在 QX 内新建脚本并粘贴内容）。
   - 在 BoxJS 中导入 `BoxJS.json`，查看并管理 `ChinaTelecomCookie`、`ChinaTelecomCookie_update`、`ChinaTelecomLoginUrl`。
3. 打开中国电信 App 或访问登录网页，触发登录跳转。若匹配 rewrite 规则，脚本会自动捕获 Cookie 并写入 BoxJS。

## 使用细节
- **rewrite 规则** 使用 `script-request-header`，会在拦截到请求时将请求头传入脚本以供抓取 Cookie。
- **MITM**：需要在 Quantumult X 中启用 MITM，并确保证书已安装与信任，以便抓包 HTTPS 请求。
- **loginUrl**（可选）：某些登录流程需要访问带签名的 loginUrl 才能生成 Cookie；你可以把该 URL 存入 BoxJS（ChinaTelecomLoginUrl）或 QX 的持久化数据中，定时任务可尝试访问以触发刷新。
- **安全**：**不要将实际 Cookie 提交到公共仓库**。本仓库示例仅用于脚本与配置，实际使用时务必保密。

## 上传到 GitHub（简要）
1. 新建仓库 `ChinaTelecom-Cookie`。
2. 将本目录文件上传或使用 git push 上传（详见下文完整版步骤）。
3. 推送后可通过 raw.githubusercontent.com 访问脚本原始文件（用于 QX 从 URL 导入）。

## 高级（可选）
- 支持多账号：将脚本改成保存多个键 `ChinaTelecomCookie_1`, `_2`，并在 BoxJS 中列出。
- 自动写入 Scriptable：如果你使用 BoxJS，可通过 BoxJS 的 API 让 Scriptable 读取 Cookie（联系我可生成 Scriptable 示例）。

## 免责声明
请勿将敏感凭证（Cookie、账号、密码）上传到公共仓库。如不慎泄露，应立即更换密码并在服务端登出所有设备。

