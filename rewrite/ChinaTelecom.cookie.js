
/*
 * 中国电信 Cookie 获取脚本
 * Quantumult X / Surge / Loon 通用
 * 自动写入 $prefs，可在 BoxJS 中查看
 */

const KEY = "ChinaTelecomCookie";

!(async () => {
  if (typeof $request !== "undefined") {
    const cookie = $request.headers["Cookie"] || $request.headers["cookie"];
    if (cookie) {
      const oldCookie = $prefs.valueForKey(KEY);
      if (oldCookie !== cookie) {
        $prefs.setValueForKey(cookie, KEY);
        $prefs.setValueForKey(new Date().toLocaleString(), `${KEY}_update`);
        $notify("✅ 中国电信 Cookie 获取成功", "", "已写入 BoxJS，可查看状态");
      } else {
        $notify("ℹ️ Cookie 未变化", "", "无需更新");
      }
    } else {
      $notify("❌ 获取失败", "", "未捕获到 Cookie");
    }
    $done({});
  } else {
    $done({});
  }
})();
