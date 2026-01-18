// 书签节点数据结构
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  type: 'folder' | 'bookmark';
  children?: BookmarkNode[];
  selected?: 'dock' | 'card' | null;
}

// 生成唯一ID
function generateId(): string {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 书签HTML解析器
export class BookmarkHTMLParser {
  parse(htmlContent: string): BookmarkNode[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      console.log('📄 HTML内容长度:', htmlContent.length);
      console.log('📄 HTML前500字符:', htmlContent.substring(0, 500));

      // 查找根DL标签（大小写不敏感）
      let rootDL = doc.querySelector('DL') || doc.querySelector('dl');
      if (!rootDL) {
        console.error('❌ 未找到DL标签');
        console.log('📄 完整HTML结构:', doc.body.innerHTML);
        throw new Error('无效的书签HTML格式：未找到DL标签');
      }

      console.log('✅ 找到根DL标签');
      const result = this.parseDL(rootDL);
      console.log('📊 解析结果:', result.length, '个节点');
      return result;
    } catch (error) {
      console.error('解析书签HTML失败:', error);
      throw error;
    }
  }

  private parseDL(dlElement: Element): BookmarkNode[] {
    const nodes: BookmarkNode[] = [];
    const children = Array.from(dlElement.children);

    console.log('🔍 parseDL - 子元素数量:', children.length);
    console.log('🔍 parseDL - 子元素标签:', children.map(c => c.tagName).join(', '));

    let i = 0;
    while (i < children.length) {
      const child = children[i];

      // 兼容大小写
      const tagName = child.tagName.toUpperCase();

      // 跳过 P 标签（Netscape 书签格式的历史遗留）
      if (tagName === 'P') {
        i++;
        continue;
      }

      if (tagName === 'DT') {
        const h3 = child.querySelector('H3') || child.querySelector('h3');
        const a = child.querySelector('A') || child.querySelector('a');

        if (h3) {
          // 这是文件夹
          console.log('📁 找到文件夹:', h3.textContent?.trim());

          // 子文件夹的 DL 可能在 DT 内部，也可能是下一个兄弟元素
          let nextDL: Element | null = null;
          let skipCount = 0;

          // 方法1：先在 DT 内部查找 DL（标准的 Netscape 格式）
          nextDL = child.querySelector('DL') || child.querySelector('dl');

          if (nextDL) {
            console.log('  ✅ 在 DT 内部找到子 DL');
          } else {
            // 方法2：在兄弟元素中查找（某些浏览器的导出格式）
            console.log('🔍 在兄弟元素中查找子文件夹，从索引', i + 1, '开始');
            for (let j = i + 1; j < children.length; j++) {
              const nextTag = children[j].tagName.toUpperCase();
              console.log(`  - 索引 ${j}: ${nextTag}`);
              if (nextTag === 'DL') {
                nextDL = children[j];
                skipCount = j - i;
                console.log('  ✅ 找到子 DL，skipCount =', skipCount);
                break;
              } else if (nextTag === 'DT') {
                // 遇到下一个 DT，说明这个文件夹没有子元素
                console.log('  ⚠️ 遇到下一个 DT，文件夹无子元素');
                break;
              }
            }
          }

          if (!nextDL) {
            console.log('  ❌ 未找到子 DL 元素');
          }

          const folderChildren = nextDL ? this.parseDL(nextDL) : [];
          console.log('📁 文件夹子元素数量:', folderChildren.length);

          nodes.push({
            id: generateId(),
            title: h3.textContent?.trim() || '未命名文件夹',
            type: 'folder',
            children: folderChildren,
            selected: null
          });

          // 跳过已处理的元素
          i += skipCount;
        } else if (a) {
          // 这是书签
          const url = a.getAttribute('HREF') || a.getAttribute('href');
          if (url) {
            console.log('🔖 找到书签:', a.textContent?.trim(), '→', url);
            nodes.push({
              id: generateId(),
              title: a.textContent?.trim() || '未命名书签',
              url: url,
              type: 'bookmark',
              selected: null
            });
          }
        }
      }

      i++;
    }

    console.log('✅ parseDL 完成 - 解析出', nodes.length, '个节点');
    return nodes;
  }
}

// 提取选中的书签
export function extractSelected(
  bookmarks: BookmarkNode[],
  type: 'dock' | 'card'
): BookmarkNode[] {
  const result: BookmarkNode[] = [];

  function traverse(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.type === 'bookmark' && node.selected === type) {
        result.push(node);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarks);
  return result;
}

// 统计书签数量
export function countBookmarks(bookmarks: BookmarkNode[]): number {
  let count = 0;

  function traverse(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.type === 'bookmark') {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarks);
  return count;
}

// 统计选中的书签数量
export function countSelected(
  bookmarks: BookmarkNode[],
  type: 'dock' | 'card'
): number {
  return extractSelected(bookmarks, type).length;
}
