# Telegram 强制跳转至 Turrit 代理规则 (Quantumult X)
# GitHub 仓库托管版
# 更新时间：2024/01/20

[host]
# 无需额外 host 配置

[rewrite_local]
# 核心跳转规则
^https?://(www\.)?telegram\.org/.* url 302 https://t.me/proxy?server=YOUR_TURRIT_SERVER&port=443&secret=YOUR_TURRIT_SECRET
^https?://t\.me/?$ url 302 https://t.me/proxy?server=YOUR_TURRIT_SERVER&port=443&secret=YOUR_TURRIT_SECRET

[mitm]
# 必须解密的域名
hostname = *.telegram.org, t.me
