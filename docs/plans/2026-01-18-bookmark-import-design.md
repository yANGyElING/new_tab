# 收藏夹导入功能设计文档

## 概述

实现浏览器收藏夹导入功能，允许用户将浏览器导出的书签HTML文件导入，并选择性地将书签转换为Dock图标或网站卡片。

## 设计决策

### 1. 数据来源
- **方式**：手动导入HTML文件
- **理由**：不需要额外的浏览器权限，用户隐私可控
- **辅助功能**：提供"打开书签管理器"按钮，跳转到 `chrome://bookmarks` 引导用户导出

### 2. 转换目标选择
- **方式**：逐个选择模式
- **理由**：灵活性最高，用户可以精确控制每个书签的转换目标
- **操作**：每个书签旁边有"添加到Dock"和"添加为卡片"两个按钮

### 3. 文件夹结构处理
- **方式**：保留文件夹树形结构
- **理由**：符合用户原有的组织习惯，支持展开/折叠，方便浏览
- **特性**：文件夹可展开/折叠，显示子项数量

### 4. 数据处理
- **方式**：预览确认模式
- **理由**：用户可以在最终添加前查看和调整
- **特性**：显示即将添加的内容，支持单独移除，自动去重

### 5. 功能入口
- **位置**：Settings页面 → "数据管理" section
- **理由**：功能归类合理，与现有的导入导出功能放在一起

## 功能流程

```
1. 导入阶段
   ↓
2. 引导导出（提供"打开书签管理器"按钮 + 上传HTML文件）
   ↓
3. 解析阶段（解析HTML，提取书签和文件夹结构）
   ↓
4. 选择阶段（树形结构，逐个选择转为Dock或卡片）
   ↓
5. 预览阶段（展示即将添加的内容，可调整）
   ↓
6. 确认阶段（自动去重，添加到系统，显示结果）
```

## 组件架构

```
BookmarkImportModal (主弹窗)
├── BookmarkUploadStep (上传步骤)
│   ├── ExportGuide (导出引导区域)
│   │   ├── 操作说明文字
│   │   ├── "打开书签管理器"按钮
│   │   └── 步骤说明
│   └── FileUploadZone (文件上传区)
├── BookmarkTreeView (树形选择视图)
│   ├── BookmarkFolderItem (文件夹项)
│   └── BookmarkItem (书签项)
├── BookmarkPreview (预览确认)
│   ├── DockPreviewList (Dock预览列表)
│   └── CardPreviewList (卡片预览列表)
└── BookmarkImportResult (导入结果)
```

## 数据结构

### BookmarkNode
```typescript
interface BookmarkNode {
  id: string;                          // 唯一标识
  title: string;                       // 书签/文件夹标题
  url?: string;                        // 书签URL（文件夹没有）
  type: 'folder' | 'bookmark';         // 类型
  children?: BookmarkNode[];           // 子项（仅文件夹有）
  selected?: 'dock' | 'card' | null;   // 用户选择的转换目标
}
```

### ImportResult
```typescript
interface ImportResult {
  dockAdded: number;                   // 添加的Dock数量
  cardsAdded: number;                  // 添加的卡片数量
  skipped: number;                     // 跳过的数量
  dockItems: DockItem[];               // 添加的Dock项
  cardItems: WebsiteCardData[];        // 添加的卡片项
  skippedItems: {                      // 跳过的项目详情
    title: string;
    reason: string;
  }[];
}
```

## 核心功能实现

### 1. HTML解析器

```typescript
class BookmarkHTMLParser {
  parse(htmlContent: string): BookmarkNode[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const rootDL = doc.querySelector('DL');
    return this.parseDL(rootDL);
  }

  private parseDL(dlElement: Element): BookmarkNode[] {
    // 递归解析DL标签
    // H3标签 = 文件夹
    // A标签 = 书签
  }
}
```

**浏览器书签HTML格式**：
```html
<DT><H3>文件夹名</H3>
<DL><p>
    <DT><A HREF="https://example.com">书签标题</A>
    <DT><H3>子文件夹</H3>
    <DL><p>
        <DT><A HREF="https://sub.com">子书签</A>
    </DL><p>
</DL><p>
```

### 2. 数据转换

```typescript
// 转换为Dock数据
function convertToDockItem(bookmark: BookmarkNode): DockItem {
  return {
    id: generateId(),
    name: bookmark.title,
    url: bookmark.url!,
    icon: '',
    type: 'link'
  };
}

// 转换为Card数据
function convertToCardItem(bookmark: BookmarkNode): WebsiteCardData {
  return {
    id: generateId(),
    name: bookmark.title,
    url: bookmark.url!,
    favicon: '',
    tags: [],
    visitCount: 0
  };
}
```

### 3. 导入处理器

```typescript
class BookmarkImportHandler {
  async importBookmarks(
    selectedBookmarks: BookmarkNode[],
    existingDockItems: DockItem[],
    existingCards: WebsiteCardData[]
  ): Promise<ImportResult> {
    // 1. 提取选中的书签
    // 2. 检查URL是否已存在（去重）
    // 3. 转换为Dock/Card数据
    // 4. 返回导入结果
  }
}
```

## UI组件详细设计

### 1. BookmarkUploadStep（上传步骤）

**布局**：
- 顶部：标题 "导入浏览器收藏夹"
- 引导区：
  - 说明文字："需要先从浏览器导出书签HTML文件"
  - "打开书签管理器"按钮（跳转 chrome://bookmarks）
  - 简单步骤说明（3步）
- 上传区：
  - 拖拽上传区域
  - "选择文件"按钮
  - 支持的格式提示：HTML

### 2. BookmarkTreeView（树形选择视图）

**布局**：
- 顶部统计栏：
  - 共 X 个书签
  - 已选择 X 个Dock
  - 已选择 X 个卡片
- 树形列表：
  - 文件夹项（可展开/折叠）
  - 书签项（带操作按钮）
- 底部操作栏：
  - "取消"按钮
  - "下一步"按钮

**BookmarkFolderItem**：
- 展开/折叠图标
- 文件夹图标（黄色）
- 文件夹名称
- 子项数量

**BookmarkItem**：
- 书签图标（蓝色）
- 书签标题
- URL（灰色小字）
- 操作按钮：
  - "Dock"按钮（带图标）
  - "卡片"按钮（带图标）
  - 选中状态高亮

### 3. BookmarkPreview（预览确认）

**布局**：
- 顶部：
  - 标题 "预览即将添加的内容"
  - 统计信息
- Dock预览区：
  - 标题 "Dock图标 (X)"
  - 列表展示（每项可移除）
- 卡片预览区：
  - 标题 "网站卡片 (X)"
  - 网格展示（每项可移除）
- 空状态提示（如果没有选择）
- 底部操作栏：
  - "返回修改"按钮
  - "确认添加"按钮

### 4. BookmarkImportResult（导入结果）

**布局**：
- 成功图标（绿色对勾）
- 标题 "导入完成！"
- 统计卡片：
  - Dock图标 +X
  - 网站卡片 +X
  - 已跳过 X（如果有）
- 跳过列表（如果有）：
  - 标题 "以下项目已跳过（已存在）"
  - 列表展示
- "完成"按钮

## 关键特性

### 1. 自动去重
- 检查URL是否已存在于Dock或卡片中
- 如果存在，跳过并记录原因
- 在结果页面显示跳过的项目

### 2. 数据持久化
- 添加后自动保存到localStorage
- 触发云端同步（如果已登录）

### 3. 错误处理
- HTML解析失败：提示文件格式错误
- 文件读取失败：提示文件损坏
- 网络错误：提示同步失败（但本地已保存）

### 4. 用户体验优化
- 文件拖拽上传
- 树形结构展开/折叠动画
- 按钮点击反馈动画
- 加载状态提示
- 操作确认提示

## 实现计划

### Phase 1：基础架构
1. 创建 `BookmarkImportModal` 组件
2. 实现步骤切换逻辑
3. 创建基础UI框架

### Phase 2：HTML解析
1. 实现 `BookmarkHTMLParser` 类
2. 测试各种浏览器导出的HTML格式
3. 处理边界情况（空文件夹、特殊字符等）

### Phase 3：树形选择界面
1. 实现 `BookmarkTreeView` 组件
2. 实现 `BookmarkFolderItem` 组件
3. 实现 `BookmarkItem` 组件
4. 添加展开/折叠动画
5. 实现选择状态管理

### Phase 4：预览和导入
1. 实现 `BookmarkPreview` 组件
2. 实现 `BookmarkImportHandler` 类
3. 实现去重逻辑
4. 实现数据转换和添加

### Phase 5：结果反馈
1. 实现 `BookmarkImportResult` 组件
2. 显示统计信息
3. 显示跳过列表

### Phase 6：集成和优化
1. 在Settings页面添加入口按钮
2. 测试完整流程
3. 优化UI和动画
4. 错误处理和边界情况测试

## 技术栈

- **React**：组件开发
- **TypeScript**：类型安全
- **Framer Motion**：动画效果
- **Tailwind CSS**：样式
- **DOMParser**：HTML解析

## 测试计划

### 单元测试
- HTML解析器测试（各种格式）
- 数据转换测试
- 去重逻辑测试

### 集成测试
- 完整导入流程测试
- 数据持久化测试
- 云端同步测试

### 用户测试
- 不同浏览器导出的HTML兼容性
- 大量书签性能测试
- 边界情况测试

## 未来扩展

1. **批量操作**：支持文件夹级别的批量选择
2. **标签映射**：将书签文件夹名称映射为卡片标签
3. **智能推荐**：根据书签位置或名称智能推荐转换目标
4. **增量导入**：支持多次导入，自动合并
5. **导出功能**：支持将Dock和卡片导出为书签HTML

---

**设计完成日期**：2026-01-18
**设计者**：老王
