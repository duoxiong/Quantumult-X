/*
 * ChinaTelecom.refresh_on_demand.js
 * 可选任务：主动访问 loginUrl（如果存于 $prefs）以触发重定向登录并让 rewrite 捕获新 Cookie
 * 用法：当你想尝试在后台手动刷新 Cookie 时运行（或加入 task_local）
 */

const LOGIN_URL_KEY = "ChinaTelecomLoginUrl";

!(async () => {
  const loginUrl = $prefs.valueForKey(LOGIN_URL_KEY) || "";
  if (!loginUrl) {
    $notify("未配置 loginUrl", "请在 Quantumult X 持久化数据中设置 ChinaTelecomLoginUrl", "");
    return $done();
  }
  try {
    await $task.fetch({ url: loginUrl, timeout: 15000 });
    $notify("已访问 loginUrl", "若登录跳转有效，rewrite 将捕获并更新 Cookie", "");
  } catch (e) {
    $notify("访问 loginUrl 失败", String(e), "");
  }
  $done();
})();
