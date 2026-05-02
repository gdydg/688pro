// 监听 Fetch 事件（EdgeOne 标准入口）
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 路由分发
  if (path === '/m3u' || path === '/txt') {
    return await fetchAndFormatStreams(path);
  }

  return new Response('请访问 /m3u 或 /txt 获取带有分组的直播源', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function fetchAndFormatStreams(path) {
  const apiUrl = 'https://apicdn.syletao.top/api/live_streaming/getLiveList6?page=1&type=-1&isweb=1';

  try {
    const response = await fetch(apiUrl, {
      headers: {
        // 模拟正常浏览器请求，防止被上游防火墙拦截
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(`获取上游 API 失败，状态码: ${response.status}`, { status: 502 });
    }

    const json = await response.json();
    const liveList = json?.data?.data || [];
    const streams = [];

    // 遍历并筛选数据
    for (const item of liveList) {
      if (item.user_nickname === '原声直播' && item.pull) {
        // 1. 处理标题：替换第一个空格为冒号，将 VS 替换为 -VS-
        let title = item.title.trim();
        title = title.replace(/\s+/, ':').replace(/\s*VS\s*/i, '-VS-');

        // 2. 处理 URL：提取 Path 和 Search，拼接到你的 EdgeOne 域名
        let proxyUrl = item.pull;
        try {
          const parsedUrl = new URL(item.pull);
          // parsedUrl.pathname 提取类似 /live/sd-1-4343369.m3u8
          // parsedUrl.search 提取可能存在的参数，如 ?token=xxx
          proxyUrl = `https://688gerger.zh-cn.edgeone.run${parsedUrl.pathname}${parsedUrl.search}`;
        } catch (e) {
          console.error("URL解析失败，跳过该项:", item.pull);
          continue; 
        }

        streams.push({ title, url: proxyUrl });
      }
    }

    // 根据请求路径返回不同格式
    if (path === '/m3u') {
      let m3uContent = '#EXTM3U\n';
      streams.forEach(stream => {
        m3uContent += `#EXTINF:-1 group-title="688原声",${stream.title}\n${stream.url}\n`;
      });
      
      return new Response(m3uContent, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
      
    } else if (path === '/txt') {
      let txtContent = '688原声,#genre\n';
      streams.forEach(stream => {
        txtContent += `${stream.title},${stream.url}\n`;
      });
      
      return new Response(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    return new Response(`Edge Function 运行错误: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
