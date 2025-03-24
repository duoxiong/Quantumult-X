[rewrite_local]
# Telegram 跳转至 Turrit
^https?://(www\.)?t\.me/(.*) url 301 https://turrit.xyz/$2
^https?://(www\.)?telegram\.org/(.*) url 301 https://turrit.xyz/$2

[mitm]
hostname = t.me, telegram.org
