/*
 * ChinaTelecom.cookie.js
 * 中国电信 Cookie 获取脚本（Quantumult X / Surge / Loon）
 * 抓取请求头中的 Cookie（包含 SSON）并写入 $prefs（BoxJS 可读取）
 *
 * 使用建议：
 * - 将此脚本放到 Quantumult X 的 Scripts 目录
 * - rewrite_local 中使用 script-request-header 规则指向此脚本
 */

const KEY = "ChinaTelecomCookie";

!(async () => {
  if (typeof $request !== "undefined") {
    const cookie = $request.headers["Cookie"] || $request.headers["cookie"] || "";
    if (!cookie) {
      console.log("[ChinaTelecom] 未在请求头发现 Cookie");
      $done({});
    }
    try {
      const oldCookie = $prefs.valueForKey(KEY) || "";
      if (oldCookie !== cookie) {
        $prefs.setValueForKey(cookie, KEY);
        $prefs.setValueForKey(new Date().toLocaleString(), `${KEY}_update`);
        console.log("[ChinaTelecom] Cookie 已更新并写入 $prefs");
        $notify("中国电信 Cookie 更新成功", "", "已写入 BoxJS 可查看");
      } else {
        console.log("[ChinaTelecom] Cookie 未变化，跳过写入");
      }
    } catch (e) {
      console.log("[ChinaTelecom] 写入 $prefs 失败: " + e);
      $notify("中国电信 Cookie 写入失败", "", String(e));
    }
    $done({});
  } else {
    // 手动运行时展示当前状态
    const ck = $prefs.valueForKey(KEY) || "";
    const up = $prefs.valueForKey(`${KEY}_update`) || "未记录";
    if (ck) {
      $notify("中国电信 Cookie（当前）", up, ck.substring(0, 120) + "...");
    } else {
      $notify("中国电信 Cookie", "未抓取到 Cookie", "");
    }
    $done({});
  }
})();
