/*
脚本名称：长城/坦克汽车自动签到 (简化版)
脚本作者：GWM_User

================ Quantumult X 配置 ================

[MITM]
hostname = app-api.gwm.com.cn

[rewrite_local]
^https://app-api.gwm.com.cn/app/v1/user/info url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js
^https://app-api.gwm.com.cn/app/v1/user/login url script-request-header https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js

[task_local]
0 9 * * * https://raw.githubusercontent.com/duoxiong/Quantumult-X/refs/heads/main/rewrite/gwm_auto.js, tag=长城汽车签到, enabled=true

*/

var $ = new Env(“长城汽车签到”);
var GWM_TOKEN_KEY = ‘gwm_token’;
var GWM_HOST = ‘app-api.gwm.com.cn’;
var API_SIGN = ‘/app/v1/activity/sign_in’;

var isRequest = typeof $request !== ‘undefined’;

if (isRequest) {
handleRequest();
} else {
handleTask();
}

function handleRequest() {
console.log(“开始提取Token”);
var headers = $request.headers || {};
var token = ‘’;

```
// 检查Authorization header
if (headers['Authorization']) {
    token = headers['Authorization'];
} else if (headers['authorization']) {
    token = headers['authorization'];
} else if (headers['token']) {
    token = headers['token'];
} else if (headers['Token']) {
    token = headers['Token'];
} else if (headers['X-Access-Token']) {
    token = headers['X-Access-Token'];
}

if (token && token.length > 10) {
    var oldToken = $.getdata(GWM_TOKEN_KEY);
    if (oldToken != token) {
        $.setdata(token, GWM_TOKEN_KEY);
        $.msg("长城汽车", "Token抓取成功", "已保存");
        console.log("Token已保存");
    }
} else {
    console.log("未找到有效Token");
}
```

}

function handleTask() {
var token = $.getdata(GWM_TOKEN_KEY);

```
if (!token) {
    $.msg("长城汽车", "错误", "请先打开App获取Token");
    $.done();
    return;
}

var tokens = [];
if (token.indexOf('@') > -1) {
    tokens = token.split('@');
} else {
    tokens = [token];
}

processTokens(tokens, 0);
```

}

function processTokens(tokens, index) {
if (index >= tokens.length) {
$.done();
return;
}

```
var currentToken = tokens[index];
if (!currentToken || currentToken.length < 10) {
    processTokens(tokens, index + 1);
    return;
}

signIn(currentToken, function() {
    setTimeout(function() {
        processTokens(tokens, index + 1);
    }, 2000);
});
```

}

function signIn(token, callback) {
var options = {
url: ‘https://’ + GWM_HOST + API_SIGN,
headers: {
‘Host’: GWM_HOST,
‘Content-Type’: ‘application/json’,
‘User-Agent’: ‘Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)’,
‘Authorization’: token
},
body: ‘{}’
};

```
$post(options, function(err, resp, data) {
    if (err) {
        $.msg("长城汽车", "网络错误", err);
    } else {
        try {
            var result = JSON.parse(data);
            if (result.code == 200 || result.code == 0) {
                $.msg("长城汽车", "签到成功", result.message || "成功");
            } else if (result.code == 1001) {
                $.msg("长城汽车", "提示", "今日已签到");
            } else {
                $.msg("长城汽车", "签到失败", result.message || "未知错误");
            }
        } catch (e) {
            $.msg("长城汽车", "解析错误", e.message);
        }
    }
    if (callback) callback();
});
```

}

function Env(name) {
this.name = name;
this.logs = [];
this.isSurge = function() {
return typeof $httpClient != “undefined”;
};
this.isQuanX = function() {
return typeof $task != “undefined”;
};
this.msg = function(title, subtitle, body) {
if (this.isSurge()) {
$notification.post(title, subtitle, body);
} else if (this.isQuanX()) {
$notify(title, subtitle, body);
}
};
this.getdata = function(key) {
if (this.isSurge()) {
return $persistentStore.read(key);
} else if (this.isQuanX()) {
return $prefs.valueForKey(key);
}
};
this.setdata = function(val, key) {
if (this.isSurge()) {
return $persistentStore.write(val, key);
} else if (this.isQuanX()) {
return $prefs.setValueForKey(val, key);
}
};
this.post = function(options, callback) {
if (this.isSurge()) {
$httpClient.post(options, callback);
} else if (this.isQuanX()) {
options.method = ‘POST’;
$task.fetch(options).then(function(resp) {
callback(null, resp, resp.body);
}).catch(function(err) {
callback(err);
});
}
};
this.done = function() {
if (this.isSurge() || this.isQuanX()) {
$done();
}
};
}