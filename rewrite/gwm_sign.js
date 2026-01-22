/*
长城/哈弗汽车自动签到 (直连硬核版)
文件路径: rewrite/gwm_sign.js
更新时间: 2026-01-22
说明: 基于抓包数据硬编码，无须Rewrite，直接运行任务即可。
*/

const $ = new Env("长城汽车签到");

// -------------------------------------------------------
// 1. 核心配置区 (已内置你的鉴权数据)
// -------------------------------------------------------

const config = {
  // 真实的签到接口
  url: "https://gwm-api.gwmapp-h.com/community-u/v1/user/sign/sureNew",
  
  // 你的 UserID
  body: JSON.stringify({
    "userId": "U1386021354645749760"
  }),

  // 请求头 (已移除 Host/Content-Length 等可能导致卡死的字段)
  headers: {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": "https://hippo-app-hw.gwmapp-h.com",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 fromappios sapp cVer=1.9.9",
    "AppID": "GWM-H5-110001",
    "sourceApp": "GWM",
    "Authtype": "BMP",
    // 你的真实凭证
    "Authorization": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfdHlwZSI6MSwiand0VHlwZSI6MSwiYmVhbklkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImtleSI6ImJlYW4tYXBwLXVzZXIta2V5IiwiZ3dtQnJhbmQiOiJDQ0cwMDEiLCJpc3MiOiJnd3QgU2VydmVyIiwic3NvSWQiOiJVMTM4NjAyMTM1NDY0NTc0OTc2MCIsInJvbGVDb2RlIjoiYWRtaW4iLCJnd21ScyI6IjIiLCJnd0lkIjoiMzQ1MjQ2MTUzNzY0NzEyNDQ4MCIsImlhdCI6MTc2ODg3ODMwOSwiZXhwIjoxNzY5NDgzMTA5LCJjaGFubmVsIjoiNTlCMTEzMkItQzU5OS00NjRCLTgxMjgtOTc2Q0E1QTI0MkZDIn0.AJGlpQDYuEGYXLi1Go5dsEYFXk5QfxVhP6f-b_BymAoKa_COyi0vO_7kh3MTYFPpGFYbJ9aeYINYhv9_cr-dWdU2Koke7dW2w6nyed5_I2hgTdpa3L-6RHM9wdbOv7C1BRBUA56BfbGdSpcAzwNhcR8QS7r4mHN1ywEq-4kHG80LhFfuSNVsUa5WzwhbSpDdTO-ptN7GIxgun4Kh7dzAfuCixfGSo37NBuvaHzDgtc1FmB211Tl0gSWfP4FO2hz8TZjrGLLU4iWQWW-a1LRRI1orXMyxFOXZKhYBXVpG1WrMt66Fgdq5vF8b2U_tWHKxirUaHHbjqGopU-ifsB32u5KFQ7NvQK8",
    "G-Token": "eyJnc24iOiJTMSIsImFsZyI6IlNIQTI1NndpdGhSU0EiLCJ0eXAiOiJKV1QifQ.eyJuYmYiOjE3Njg4NzgzMDksInNvdXJjZUFwcCI6IkdXTSIsInNvdXJjZVR5cGUiOiJJT1MiLCJhcHBJZCI6IkdXTS1BUFAtSU9TLTExMDAwMjAiLCJleHAiOjE3Njk0ODMxMDksImlhdCI6MTc2ODg3ODMwOSwidXNlcklkIjoiVTEzODYwMjEzNTQ2NDU3NDk3NjAiLCJkZXZpY2VJZCI6IjU5QjExMzJCLUM1OTktNDY0Qi04MTI4LTk3NkNBNUEyNDJGQyJ9.dv6u68meIV9NrsPGynu6GQoUFKKx4yofiw989DUbno4sU8ih62+xUV4/czG8/iIA8RJuuCEsKW1hln97aROkptQSwKAGHFdIe50aUzIzS2OsLsKxNc2ZECicLxisB6AHzc4Y9WSpBpEyQ2UmtWw9ZRckSdLov3dpxRLBKzCni2QvqVVl5Za2dvZeP/i5T0G2JmYaw3bJ++MS/gUybK2Eq2R1GZaL5v3ChFFN1DQR+L3GjAu7niPyBiFBCNVvV5I+xP2ggjQIXb3riINzwKiV0bIsOqt0jiRqUM1NNsWo8BcdfUWaXNYcv6ynKknWHvvZyrS+opVGksoeDpEV6uEWaQ==",
    // 你的签名数据
    "sign": "a70f912f8a1e1d0b6b848b60cc52591f3d2a12bea25ec781ad13f9e4192474ce",
    "TimeStamp": "1769043392226"
  }
};

// -------------------------------------------------------
// 2. 执行逻辑
// -------------------------------------------------------

main();

async function main() {
  $.msg($.name, "🚀 发起签到", "正在直连服务器...");

  const options = {
    url: config.url,
    method: "POST",
    headers: config.headers,
    body: config.body,
    timeout: 15000 // 15秒超时设置，防止无限转圈
  };

  $.post(options, (err, resp, data) => {
    // 1. 处理网络层面的错误
    if (err) {
      console.log("❌ 网络错误: " + JSON.stringify(err));
      $.msg($.name, "🚫 网络请求失败", "请检查网络连接");
      $.done();
      return;
    }

    // 2. 处理业务层面的结果
    try {
      console.log("服务器返回: " + data);
      const result = JSON.parse(data);

      // 判定成功的条件：code=200 或 success=true 或 消息包含“成功”
      if (result.code == 200 || result.success || (result.message && result.message.includes("成功"))) {
        const score = result.data ? ` (积分: ${result.data})` : "";
        $.msg($.name, "✅ 签到成功", `结果: ${result.message || "OK"}${score}`);
      } else {
        // 即使是“今日已签到”也算成功运行
        $.msg($.name, "⚠️ 签到反馈", `状态: ${result.message}`);
      }
    } catch (e) {
      console.log("解析异常: " + e);
      // 如果返回的不是 JSON（比如HTML报错页），也提示出来
      $.msg($.name, "❌ 数据异常", "服务端返回了非 JSON 格式数据");
    }
    
    $.done();
  });
}

// -------------------------------------------------------
// 3. 极简 Env 工具函数 (无需改动)
// -------------------------------------------------------
function Env(name) {
  return new class {
    constructor(name) { this.name = name; }
    msg(title, sub, desc) {
      if (typeof $notify !== "undefined") $notify(title, sub, desc);
      console.log(`[${title}] ${sub} - ${desc}`);
    }
    post(opts, cb) {
      if (typeof $task !== "undefined") {
        $task.fetch(opts).then(
          resp => cb(null, resp, resp.body),
          err => cb(err, null, null)
        );
      }
    }
    done() {
      if (typeof $done !== "undefined") $done({});
    }
  }(name);
}
