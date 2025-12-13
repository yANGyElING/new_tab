# 常用命令（在 PowerShell，项目根目录）
- 开发：`pnpm dev`（别名 dev:client）
- 构建：`pnpm build`（会清理 dist、构建前端、复制 package.json、写 build.flag）
- 部署（GitHub Pages）：`pnpm deploy`
- 代码检查：`pnpm lint`
- 生成 PWA 图标：`node generate-pwa-icons.cjs`

注意：不要自动安装依赖；由用户手动执行 `pnpm install`。