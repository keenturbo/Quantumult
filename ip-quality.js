/***
[task_local]
event-interaction https://你的域名/api/qx-script, tag=IP质量检测(AI版), img-url=checkmark.shield.fill.system

@Description: 调用自建 Cloudflare API 进行多源 IP 质量检测与 AI 分析
***/

// 你的 Cloudflare Pages 域名
const BASE_URL = "https://你的域名.pages.dev";

const url = `${BASE_URL}/api/generate`;
const method = "POST";
const headers = {
    "Content-Type": "application/json",
    "User-Agent": "QuantumultX/1.0"
};
// 获取当前节点的 IP（通过 httpbin 或直接传空让后端获取）
// 这里我们让后端自动识别请求 IP，或者你可以先请求 ip-api 拿到 IP 再传
const data = {
    ip: "" // 留空，让后端自动获取请求 IP，或者在 QX 中通过 $environment.params 传代理策略
};

// 注意：AI 分析可能需要较长时间，建议把 QX 超时设置长一点
const myRequest = {
    url: url,
    method: method,
    headers: headers,
    body: JSON.stringify(data),
    opts: { policy: $environment.params }, // 使用当前选中的节点
    timeout: 15000 // AI 分析需要时间，设置 15 秒超时
};

$task.fetch(myRequest).then(response => {
    try {
        const res = JSON.parse(response.body);
        const q = res.quality;
        
        if (!q) {
            $done({ "title": "❌ 检测失败", "htmlMessage": "未能获取质量数据" });
            return;
        }

        const html = generateHtml(q, res.address);
        $done({ "title": "🛡️ IP 质量全维检测", "htmlMessage": html });
    } catch (e) {
        $done({ "title": "❌ 错误", "htmlMessage": "解析响应失败: " + e.message });
    }
}, reason => {
    $done({ "title": "❌ 超时", "htmlMessage": "请求超时，请检查网络或增加超时时间" });
});

function generateHtml(q, addr) {
    const scoreColor = getScoreColor(q.fraudScore);
    const score = q.fraudScore ?? "N/A";
    
    // AI 分析报告转换（简单处理 Markdown）
    let aiReport = q.aiReasoning || "暂无 AI 报告";
    aiReport = aiReport.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                       .replace(/- /g, '• ')
                       .replace(/\n/g, '<br>');

    return `
    <div style="font-family: -apple-system; font-size: 14px; line-height: 1.6;">
        <div style="text-align: center; padding: 10px; background-color: ${scoreColor}20; border-radius: 8px;">
            <span style="font-size: 24px; font-weight: bold; color: ${scoreColor};">${score}</span>
            <br><span style="font-size: 12px; color: #666;">欺诈评分</span>
        </div>
        
        <div style="margin-top: 15px;">
            <b>📍 基础信息</b><br>
            IP: ${q.ip || "N/A"}<br>
            类型: ${q.ipType || "N/A"}<br>
            位置: ${addr.city}, ${addr.country}<br>
            ISP: ${q.isp || "N/A"}
        </div>

        <div style="margin-top: 15px;">
            <b>⚠️ 风险标记</b><br>
            VPN: ${boolIcon(q.isVpn)} | 代理: ${boolIcon(q.isProxy)}<br>
            Tor: ${boolIcon(q.isTor)} | 托管: ${boolIcon(q.isHosting)}
        </div>

        <div style="margin-top: 15px;">
            <b>🤖 AI 深度分析</b><br>
            <div style="background: #f5f5f7; padding: 10px; border-radius: 6px; font-size: 13px;">
                ${aiReport}
            </div>
        </div>
        
        <div style="margin-top: 10px; font-size: 10px; color: #999; text-align: center;">
            数据源: ${q.sources.join(', ')}
        </div>
    </div>
    `;
}

function getScoreColor(score) {
    if (score == null) return "#999";
    if (score <= 25) return "#28a745"; // Green
    if (score <= 75) return "#ffc107"; // Yellow
    return "#dc3545"; // Red
}

function boolIcon(val) {
    return val ? "🔴" : "🟢";
}