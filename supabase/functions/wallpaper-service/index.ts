// Wallpaper Service - Supabase Edge Function
// 获取高清壁纸 - 使用 Unsplash 官方 API

import { corsHeaders } from '../_shared/cors.ts'

console.log("Wallpaper Service started");

// 支持的壁纸分辨率
const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  'uhd': { width: 3840, height: 2160 },    // 4K
  '1920x1080': { width: 1920, height: 1080 }, // 1080p
  '1366x768': { width: 1366, height: 768 },   // 720p
  'mobile': { width: 1080, height: 1920 }     // 移动端
};

// 获取中国时区的时间对象
function getChinaDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

// 壁纸主题关键词（自然风景为主）
const WALLPAPER_TOPICS = [
  'nature',
  'landscape',
  'mountains',
  'ocean',
  'forest',
  'sky',
  'sunset',
  'sunrise'
];

// 根据日期生成一个稳定的主题索引（每天同一主题）
function getDailyTopicIndex(): number {
  const today = getChinaDate();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return dayOfYear % WALLPAPER_TOPICS.length;
}

// 根据日期生成稳定的随机种子（确保每天同一图片）
function getDailySeed(): number {
  const today = getChinaDate();
  const dateStr = today.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// 获取 Unsplash 官方 API 壁纸
async function fetchUnsplashWallpaper(width: number, height: number): Promise<{ data: ArrayBuffer; finalUrl: string } | null> {
  // @ts-ignore: Deno global
  const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');

  if (!unsplashAccessKey) {
    console.log('未配置 UNSPLASH_ACCESS_KEY，跳过 Unsplash API');
    return null;
  }

  try {
    const topic = WALLPAPER_TOPICS[getDailyTopicIndex()];
    const seed = getDailySeed();

    // 使用 Unsplash 官方 API 获取随机图片
    const apiUrl = `https://api.unsplash.com/photos/random?query=${topic}&orientation=${height > width ? 'portrait' : 'landscape'}&content_filter=high`;

    console.log(`尝试 Unsplash API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log(`Unsplash API 失败: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    // 获取合适尺寸的图片URL
    let imageUrl = data.urls?.raw || data.urls?.full;
    if (imageUrl) {
      // 添加尺寸参数
      imageUrl = `${imageUrl}&w=${width}&h=${height}&fit=crop&q=80`;
    } else {
      console.log('Unsplash API 返回数据缺少图片URL');
      return null;
    }

    console.log(`获取 Unsplash 图片: ${imageUrl}`);

    // 下载图片
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.arrayBuffer();
      console.log(`Unsplash 图片下载成功: ${imageData.byteLength} bytes`);
      return { data: imageData, finalUrl: imageUrl };
    }
  } catch (error: any) {
    console.log(`Unsplash API 错误: ${error.message || error}`);
  }

  return null;
}

// 获取 Picsum 壁纸（主要备用源）
function getPicsumUrl(width: number, height: number): string {
  const seed = getDailySeed();
  // 使用种子确保每天获取相同图片
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

// 获取壁纸图片
async function fetchWallpaperImage(imageUrl: string): Promise<{ data: ArrayBuffer; finalUrl: string } | null> {
  try {
    console.log(`尝试获取壁纸: ${imageUrl}`);

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000), // 20秒超时
    });

    if (response.ok) {
      const imageData = await response.arrayBuffer();
      // Unsplash会重定向到实际图片URL
      const finalUrl = response.url;
      console.log(`成功获取壁纸: ${finalUrl} (${imageData.byteLength} bytes)`);
      return { data: imageData, finalUrl };
    } else {
      console.log(`获取壁纸失败: HTTP ${response.status}`);
    }
  } catch (error: any) {
    console.log(`获取壁纸失败: ${imageUrl} - ${error.message || error}`);
  }
  return null;
}

// 备用壁纸源（Picsum 作为主要备用）
async function fetchFallbackWallpaper(width: number, height: number): Promise<{ data: ArrayBuffer; finalUrl: string } | null> {
  const seed = getDailySeed();

  // 备用源列表（按优先级排序）
  const fallbackUrls = [
    // Picsum - 稳定可靠的图片服务
    `https://picsum.photos/seed/${seed}/${width}/${height}`,
    // Picsum 随机（如果种子图片不可用）
    `https://picsum.photos/${width}/${height}`,
  ];

  for (const url of fallbackUrls) {
    const result = await fetchWallpaperImage(url);
    if (result) {
      return result;
    }
  }
  return null;
}

// 主处理函数
// @ts-ignore: Deno global
Deno.serve(async (req) => {
  const { url, method } = req;
  const requestUrl = new URL(url);

  // 处理CORS预检请求
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 获取参数
    const resolution = requestUrl.searchParams.get('resolution') || 'uhd';
    const forceRefresh = requestUrl.searchParams.get('refresh') === 'true';

    // 验证分辨率参数
    const targetResolution = RESOLUTIONS[resolution] || RESOLUTIONS['uhd'];
    const { width, height } = targetResolution;

    console.log(`壁纸请求: ${resolution} (${width}x${height})`);

    // 生成缓存键 - 基于日期和分辨率 (使用UTC+8)
    const today = getChinaDate().toISOString().split('T')[0];
    const cacheKey = `wallpaper-${today}-${resolution}.jpg`;

    // 获取Supabase环境变量
    // @ts-ignore: Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore: Deno global
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    // 如果不强制刷新，先检查缓存
    if (!forceRefresh && supabaseUrl && supabaseKey) {
      try {
        const cacheResponse = await fetch(`${supabaseUrl}/storage/v1/object/wallpapers/${cacheKey}`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });

        if (cacheResponse.ok) {
          console.log(`使用缓存壁纸: ${cacheKey}`);
          const cachedData = await cacheResponse.arrayBuffer();
          return new Response(cachedData, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=43200', // 12小时缓存
              'X-Wallpaper-Source': 'cache',
              'X-Wallpaper-Date': today,
            },
          });
        }
      } catch (error) {
        console.log(`缓存未找到: ${cacheKey}`);
      }
    }

    // 优先尝试 Unsplash 官方 API
    let wallpaperResult = await fetchUnsplashWallpaper(width, height);
    let provider = 'unsplash';

    // 如果 Unsplash API 失败，尝试 Picsum 备用源
    if (!wallpaperResult) {
      console.log('Unsplash API 获取失败，尝试 Picsum 备用源');
      wallpaperResult = await fetchFallbackWallpaper(width, height);
      provider = 'picsum';
    }

    // 如果所有方法都失败，返回错误
    if (!wallpaperResult) {
      console.log('所有壁纸源都失败');
      return new Response(
        JSON.stringify({
          error: '无法获取壁纸',
          resolution: `${width}x${height}`,
          date: today,
          fallback: '/icon/favicon.png'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: wallpaperData, finalUrl: imageUrl } = wallpaperResult;

    // 尝试缓存壁纸到Storage
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/storage/v1/object/wallpapers/${cacheKey}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'image/jpeg',
          },
          body: wallpaperData,
        });
        console.log(`成功缓存壁纸: ${cacheKey}`);
      } catch (error: any) {
        console.log('缓存壁纸失败:', error.message || error);
      }
    }

    // 返回壁纸数据
    return new Response(wallpaperData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=43200', // 12小时缓存
        'X-Wallpaper-Source': imageUrl,
        'X-Wallpaper-Resolution': `${width}x${height}`,
        'X-Wallpaper-Date': today,
        'X-Wallpaper-Size': wallpaperData.byteLength.toString(),
        'X-Wallpaper-Provider': provider,
      },
    });

  } catch (error: any) {
    console.error('壁纸服务错误:', error);

    return new Response(
      JSON.stringify({
        error: '壁纸服务内部错误',
        message: error.message || String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
