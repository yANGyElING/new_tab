# Wallpaper Service

基于 Supabase 的每日壁纸获取和缓存服务，使用 Unsplash 官方 API 获取高质量壁纸。

## 功能特性

- 🖼️ **每日更新**: 自动获取 Unsplash 高质量壁纸（自然风景主题）
- 💾 **智能缓存**: 自动缓存到 Supabase Storage，减少重复请求
- 📱 **多分辨率**: 支持4K、1080p、720p、移动端等多种分辨率
- 🌍 **无需代理**: 直接部署在 Supabase Edge Functions，避免网络限制
- ⚡ **高性能**: 边缘计算，全球低延迟访问
- 🔄 **故障转移**: Unsplash API + Picsum 备用源，自动故障转移

## API 接口

### 获取壁纸

```
GET /functions/v1/wallpaper-service
```

#### 查询参数

| 参数 | 类型 | 必需 | 默认值 | 可选值 | 说明 |
|------|------|------|--------|--------|------|
| `resolution` | string | ❌ | uhd | uhd, 1920x1080, 1366x768, mobile | 壁纸分辨率 |
| `refresh` | boolean | ❌ | false | true, false | 强制刷新缓存 |

#### 分辨率说明

| 值 | 实际分辨率 | 适用场景 |
|----|------------|----------|
| `uhd` | 3840x2160 | 4K显示器 |
| `1920x1080` | 1920x1080 | 1080p显示器 |
| `1366x768` | 1366x768 | 720p显示器 |
| `mobile` | 1080x1920 | 手机竖屏 |

#### 示例请求

```bash
# 获取4K壁纸
curl "https://your-project.supabase.co/functions/v1/wallpaper-service?resolution=uhd"

# 获取1080p壁纸
curl "https://your-project.supabase.co/functions/v1/wallpaper-service?resolution=1920x1080"

# 强制刷新获取最新壁纸
curl "https://your-project.supabase.co/functions/v1/wallpaper-service?refresh=true"
```

#### 响应

**成功响应**:
- **状态码**: 200
- **Content-Type**: `image/jpeg`
- **Headers**:
  - `Cache-Control`: 缓存控制（12小时）
  - `X-Wallpaper-Source`: 壁纸来源URL
  - `X-Wallpaper-Resolution`: 实际分辨率
  - `X-Wallpaper-Date`: 壁纸日期
  - `X-Wallpaper-Size`: 文件大小（字节）

**错误响应**:
- **状态码**: 404 - 无法获取壁纸
- **状态码**: 500 - 服务器内部错误

## 前置要求

### 1. 创建 Storage Bucket

在 Supabase 控制台中创建名为 `wallpapers` 的 Storage Bucket：

```sql
-- 在 Supabase SQL Editor 中执行
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallpapers', 'wallpapers', true);

-- 设置 Storage 策略（允许匿名读取）
CREATE POLICY "Public wallpaper access" ON storage.objects 
FOR SELECT USING (bucket_id = 'wallpapers');

-- 允许 Service Role 写入
CREATE POLICY "Service role wallpaper upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'wallpapers');

CREATE POLICY "Service role wallpaper update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'wallpapers');
```

### 2. 环境变量

确保以下环境变量已配置：

- `SUPABASE_URL`: Supabase 项目 URL
- `SUPABASE_ANON_KEY`: Supabase 匿名密钥（用于Storage读取）
- `UNSPLASH_ACCESS_KEY`: Unsplash API Access Key（可选，用于获取高质量壁纸）

> **注意**: 如果未配置 `UNSPLASH_ACCESS_KEY`，服务会自动使用 Picsum 作为壁纸源。

### 3. 获取 Unsplash API Key

1. 访问 [Unsplash Developers](https://unsplash.com/developers)
2. 注册并创建一个应用
3. 获取 Access Key
4. 在 Supabase Dashboard 的 Edge Functions 设置中添加环境变量

## 部署

```bash
# 部署 Edge Function
supabase functions deploy wallpaper-service

# 设置 Unsplash API Key（可选）
supabase secrets set UNSPLASH_ACCESS_KEY=your_access_key_here
```

## 壁纸源优先级

1. **Unsplash 官方 API** - 高质量自然风景壁纸（需要 API Key）
2. **Picsum Photos** - 稳定可靠的备用图片服务（无需 API Key）

## 缓存策略

- **Storage 缓存**: 按日期和分辨率缓存，避免重复下载
- **HTTP 缓存**: 12小时（Cache-Control）
- **缓存键格式**: `wallpaper-{YYYY-MM-DD}-{resolution}.jpg`
- **自动更新**: 每日零点后首次请求会获取新壁纸

## 监控和日志

通过 Supabase Dashboard 的 Edge Functions 日志查看：

- 壁纸获取成功/失败情况
- 缓存命中率
- 响应时间和性能指标
- 错误信息和调试日志

## 错误处理

- **多源故障转移**: 如果 Unsplash API 失败，自动切换到 Picsum
- **超时保护**: API 请求 15 秒超时，图片下载 20 秒超时
- **优雅降级**: 提供默认图片备选方案
- **详细日志**: 记录每个步骤的成功/失败信息

## 集成到前端

```typescript
// 获取今日4K壁纸
const wallpaperUrl = 'https://your-project.supabase.co/functions/v1/wallpaper-service?resolution=uhd';

// 设置为背景
document.body.style.backgroundImage = `url(${wallpaperUrl})`;
```

## 性能优化

- **Edge Functions**: 全球分布式部署
- **智能缓存**: 减少重复网络请求  
- **多分辨率**: 根据设备选择合适分辨率
- **并发控制**: 避免同时多次下载同一壁纸