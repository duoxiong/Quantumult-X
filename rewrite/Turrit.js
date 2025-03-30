[rewrite_local]
# Telegram 跳转至 Turrit
^https?://(www\.)?t\.me/(.*) url 301 https://turrit.xyz/$2
^https?://(www\.)?telegram\.org/(.*) url 301 https://turrit.xyz/$2
^https?:\/\/t\.me\/(.+) url 302 turrit://resolve?domain=$1

[mitm]
hostname = t.me, telegram.org
