export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 只响应 /m3u 和 /txt 路由
    if (path === '/m3u' || path === '/txt') {
      return await handleRequest(path);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleRequest(path) {
  const sourceApi = 'https://apicdn.syletao.top/api/live_streaming/getLiveList6?page=1&type=-1&isweb=1';
  const proxyPrefix = 'https://688gerger.zh-cn.edgeone.run/proxy?url=';

  try {
    // 拉取源站 API 数据
    const response = await fetch(sourceApi, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`源站请求失败: HTTP ${response.status}`);
    }
    
    const result = await response.json();
    const liveList = result?.data?.data || [];

    // 过滤出 "原声直播" 且存在 pull 链接的数据
    const filteredStreams = liveList.filter(
      (item) => item.user_nickname === '原声直播' && item.pull
    );

    let m3uOutput = '#EXTM3U\n';
    let txtOutput = '';

    filteredStreams.forEach((item) => {
      // 标题处理逻辑: "英超 狼队 VS 桑德兰" -> "英超:狼队-VS-桑德兰"
      // 1. 去除首尾多余空格
      // 2. replace(/\s+/, ':') 将遇到的第一个空白字符组替换为 ":"
      // 3. replace(/\s+/g, '-') 将剩下所有的空白字符组替换为 "-"
      const formattedTitle = item.title.trim().replace(/\s+/, ':').replace(/\s+/g, '-');
      
      // 拼接代理前缀
      const finalUrl = `${proxyPrefix}${item.pull}`;

      // 追加到输出结果中
      m3uOutput += `#EXTINF:-1,${formattedTitle}\n${finalUrl}\n`;
      txtOutput += `${formattedTitle},${finalUrl}\n`;
    });

    // 根据请求路径返回对应格式和 Content-Type
    if (path === '/m3u') {
      return new Response(m3uOutput, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Content-Disposition': 'inline; filename="live.m3u"',
          'Access-Control-Allow-Origin': '*', // 允许播放器跨域拉取
        },
      });
    }

    if (path === '/txt') {
      return new Response(txtOutput, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
