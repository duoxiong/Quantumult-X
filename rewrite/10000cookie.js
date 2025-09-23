

const KEY = "ChinaTelecomCookie";

!(async () => {
  if (typeof $request !== "undefined") {
    const url = $request.url;
    const method = $request.method;
    const headers = $request.headers || {};
    const cookie = headers["Cookie"] || headers["cookie"];

    let log = `🔍 [中国电信调试]
URL: ${url}
Method: ${method}
Headers:\n${JSON.stringify(headers, null, 2)}\n`;

    if ($request.body) {
      log += `Body:\n${$request.body}\n`;
    }
    console.log(log);

    if (cookie && (cookie.includes("SSON") || cookie.includes("JSESSIONID"))) {
      $prefs.setValueForKey(cookie, KEY);
      $notify("中国电信", "✅ Cookie 获取成功", cookie);
      console.log("✅ Cookie 已保存到 BoxJS");
    } else {
      $notify("中国电信", "⚠️ 未发现 Cookie", url);
    }
  }
  $done({});
})();
