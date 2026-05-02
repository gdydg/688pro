export async function onRequest(context) {
  const apiUrl = 'https://apicdn.syletao.top/api/live_streaming/getLiveList6?page=1&type=-1&isweb=1';

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(`获取上游 API 失败，状态码: ${response.status}`, { status: 502 });
    }

    const json = await response.json();
    const liveList = json?.data?.data || [];
    let m3uContent = '#EXTM3U\n';

    for (const item of liveList) {
      if (item.user_nickname === '原声直播' && item.pull) {
        // 格式化标题
        let title = item.title.trim();
        title = title.replace(/\s+/, ':').replace(/\s*VS\s*/i, '-VS-');

        // URL 拼接逻辑
        let proxyUrl = item.pull;
        try {
          const parsedUrl = new URL(item.pull);
          proxyUrl = `https://688gerger.zh-cn.edgeone.run${parsedUrl.pathname}${parsedUrl.search}`;
        } catch (e) {
          continue; 
        }

        m3uContent += `#EXTINF:-1 group-title="688原声",${title}\n${proxyUrl}\n`;
      }
    }

    return new Response(m3uContent, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(`运行错误: ${error.message}`, { status: 500 });
  }
}
