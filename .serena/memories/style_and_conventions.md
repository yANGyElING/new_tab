# 代码风格与约定
- 语言：TypeScript + React 函数组件。
- UI：TailwindCSS 工具类，局部使用内联样式；动画主要使用 Framer Motion。
- 状态管理：React Context（如 TransparencyContext、WorkspaceContext）+ 自定义 hooks。
- 代码质量：ESLint（@typescript-eslint、react、react-hooks），Prettier；lint 配置禁止未使用的 eslint-disable。
- 命名：驼峰；组件文件 .tsx，hooks 以 use 开头。
- 样式/资源：公共静态资源在 public/，部分 CSS 单文件（如 index.css, AnimatedCat.css）。
- 本地存储/设置：多处使用 localStorage 缓存用户偏好（如 animationStyle、searchBarBorderRadius）。
- 文件编码：UTF-8；保持简体中文文案与注释。