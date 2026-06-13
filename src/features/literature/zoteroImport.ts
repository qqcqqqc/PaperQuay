import type { ZoteroLibraryItem } from '../../types/reader';

export function zoteroItemImportIdentity(item: ZoteroLibraryItem): string {
  return (
    item.attachmentKey?.trim()
    || item.localPdfPath?.trim()
    || item.itemKey.trim()
  );
}

export function uniqueZoteroItems(items: ZoteroLibraryItem[]): ZoteroLibraryItem[] {
  const seen = new Set<string>();
  const output: ZoteroLibraryItem[] = [];

  for (const item of items) {
    const identity = zoteroItemImportIdentity(item);
    if (!identity || seen.has(identity)) continue;

    seen.add(identity);
    output.push(item);
  }

  return output;
}

export function filterZoteroItemsOutsideCollections(
  allItems: ZoteroLibraryItem[],
  collectionItems: ZoteroLibraryItem[],
): ZoteroLibraryItem[] {
  const filed = new Set(collectionItems.map(zoteroItemImportIdentity).filter(Boolean));

  return uniqueZoteroItems(allItems).filter((item) => {
    const identity = zoteroItemImportIdentity(item);
    return identity && !filed.has(identity);
  });
}

/**
 * 对同一篇 Zotero 论文的多个 PDF 附件去重。
 * 按 itemKey 分组，每组只保留一个"最佳"附件：
 * 1. 附件标题为 "PDF" 的优先（Zotero 默认主 PDF 标题）
 * 2. 文件名字符更短的优先（主 PDF 文件名通常更短）
 * 3. 仍然相同则保留第一个
 */
export function deduplicateZoteroItems(items: ZoteroLibraryItem[]): ZoteroLibraryItem[] {
  return splitZoteroItemGroups(items).map(({ main }) => main);
}

/**
 * 将 Zotero 条目按 itemKey 分组，返回主 PDF + 补充材料 PDF。
 * 导入时主 PDF 作为文献导入，补充材料作为附件挂载到该文献上。
 */
export function splitZoteroItemGroups(
  items: ZoteroLibraryItem[],
): Array<{ main: ZoteroLibraryItem; supplementary: ZoteroLibraryItem[] }> {
  const groups = new Map<string, ZoteroLibraryItem[]>();

  for (const item of items) {
    const key = item.itemKey;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return Array.from(groups.values()).map((group) => {
    if (group.length <= 1) return { main: group[0], supplementary: [] };

    // 排序：最可能是主 PDF 的排第一
    const sorted = [...group].sort((a, b) => {
      const aTitle = a.attachmentTitle?.toLowerCase().trim() ?? '';
      const bTitle = b.attachmentTitle?.toLowerCase().trim() ?? '';

      if (aTitle === 'pdf' && bTitle !== 'pdf') return -1;
      if (bTitle === 'pdf' && aTitle !== 'pdf') return 1;

      const aLen = a.attachmentFilename?.length ?? 0;
      const bLen = b.attachmentFilename?.length ?? 0;
      if (aLen < bLen) return -1;
      if (bLen < aLen) return 1;

      return 0;
    });

    return { main: sorted[0], supplementary: sorted.slice(1) };
  });
}
