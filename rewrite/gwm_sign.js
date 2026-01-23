/*
长城汽车 - 算法暴力破解机
说明：利用你抓包获取的 Secret 密钥，反向推导签名算法。
使用：覆盖代码后，直接点击运行！
*/

const $ = new Env("长城算法破解");

// 引入加密库 (QX 环境需要在线加载)
const cryptoJsUrl = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";

// 你的真实抓包数据 (基准)
const sample = {
    // 目标签名 (我们要算出一模一样的这个值)
    targetSign: "5050fa993a834bac5b5e9a7193a1db1c44f18dcc5f457d66decb9342575385a3",
    // 当时的时间戳
    timestamp: "1769128608694",
    // 你的密钥 (Headers里的 Secret)
    secret: "8bc742859a7849ec9a924c979afa5a9a",
    // 你的 Body
    body: '{"userId":"U1386021354645749760"}',
    // 你的 AppID
    appId: "GWM-H5-110001"
};

$task.fetch({ url: cryptoJsUrl }).then(response => {
    // 1. 加载 CryptoJS 库
    const CryptoJS = eval(response.body + "; CryptoJS;");
    console.log("✅ 加密库就绪，开始碰撞测试...");

    const { targetSign, timestamp, secret, body, appId } = sample;
    
    // 2. 定义所有可能的算法组合
    const combinations = [
        { name: "Secret+Time+Body",  str: secret + timestamp + body },
        { name: "Time+Secret+Body",  str: timestamp + secret + body },
        { name: "Body+Secret+Time",  str: body + secret + timestamp },
        { name: "Secret+Body+Time",  str: secret + body + timestamp },
        { name: "AppID+Secret+Time", str: appId + secret + timestamp },
        { name: "AppID+Secret+Time+Body", str: appId + secret + timestamp + body },
        { name: "Secret+AppID+Time+Body", str: secret + appId + timestamp + body },
        // 尝试加盐 (有些算法会拼接一个固定字符串)
        { name: "Secret+Time+Body+Salt", str: secret + timestamp + body + "GWM" } 
    ];

    let found = false;

    // 3. 开始循环测试
    combinations.forEach(combo => {
        // 计算 SHA256
        const calc = CryptoJS.SHA256(combo.str).toString();
        
        console.log(`正在尝试 [${combo.name}]...`);
        
        if (calc.toLowerCase() === targetSign.toLowerCase()) {
            found = true;
            console.log("\n🎉🎉🎉 破解成功！🎉🎉🎉");
            console.log(`✅ 正确算法是: [${combo.name}]`);
            console.log(`✅ 签名结果: ${calc}`);
            $notify("算法破解成功", "恭喜！", `算法模型: ${combo.name}`);
        }
    });

    if (!found) {
        console.log("\n❌ 常用组合未匹配，算法可能包含特殊排序或隐藏盐值。");
        console.log("建议：请提供抓包列表中 ID 100 以前的 JS 文件（app.js 或 main.js）");
    }

    $done();
}, reason => {
    console.log("❌ 网络错误: 无法加载加密库，请检查 QX 网络");
    $done();
});

function Env(t){return new class{constructor(t){this.name=t}msg(t,e,s){if("undefined"!=typeof $notify)$notify(t,e,s);console.log(`[${t}] ${e} - ${s}`)}done(){"undefined"!=typeof $done&&$done({})}}(t)}
