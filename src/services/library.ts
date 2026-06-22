import { invoke } from '../platform/electron/core';
import type {
  AssignPaperCategoryRequest,
  CreateCategoryRequest,
  DeletePaperRequest,
  ImportedPdfResult,
  ImportPdfRequest,
  LibrarySettings,
  LibrarySnapshot,
  ListPapersRequest,
  LiteratureAttachment,
  LiteratureCategory,
  LiteraturePaper,
  MoveCategoryRequest,
  RelocateAttachmentRequest,
  ReorderPapersRequest,
  UpdatePaperRequest,
  UpdateCategoryRequest,
} from '../types/library';

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

export async function selectLibraryPdfFiles(): Promise<string[]> {
  try {
    return (await invoke<string[] | null>('library_select_pdf_files')) ?? [];
  } catch (error) {
    throw new Error(toErrorMessage(error, '选择 PDF 文件失败'));
  }
}

export async function initializeLiteratureLibrary(): Promise<LibrarySnapshot> {
  try {
    return await invoke<LibrarySnapshot>('library_init');
  } catch (error) {
    throw new Error(toErrorMessage(error, '初始化文献库失败'));
  }
}

export async function getLibrarySettings(): Promise<LibrarySettings> {
  try {
    return await invoke<LibrarySettings>('library_get_settings');
  } catch (error) {
    throw new Error(toErrorMessage(error, '读取文献库设置失败'));
  }
}

export async function updateLibrarySettings(
  settings: LibrarySettings,
): Promise<LibrarySettings> {
  try {
    return await invoke<LibrarySettings>('library_update_settings', { settings });
  } catch (error) {
    throw new Error(toErrorMessage(error, '保存文献库设置失败'));
  }
}

export async function listLibraryCategories(): Promise<LiteratureCategory[]> {
  try {
    return await invoke<LiteratureCategory[]>('library_list_categories');
  } catch (error) {
    throw new Error(toErrorMessage(error, '读取分类失败'));
  }
}

export async function createLibraryCategory(
  request: CreateCategoryRequest,
): Promise<LiteratureCategory> {
  try {
    return await invoke<LiteratureCategory>('library_create_category', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '创建分类失败'));
  }
}

export async function updateLibraryCategory(
  request: UpdateCategoryRequest,
): Promise<LiteratureCategory> {
  try {
    return await invoke<LiteratureCategory>('library_update_category', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '更新分类失败'));
  }
}

export async function moveLibraryCategory(
  request: MoveCategoryRequest,
): Promise<LiteratureCategory> {
  try {
    return await invoke<LiteratureCategory>('library_move_category', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '移动分类失败'));
  }
}
export async function deleteLibraryCategory(request: {
  categoryId: string;
  deleteFiles?: boolean;
}): Promise<{ deletedPaperIds: string[] }> {
  try {
    return await invoke<{ deletedPaperIds: string[] }>('library_delete_category', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '删除分类失败'));
  }
}
export async function listLibraryPapers(
  request: ListPapersRequest = {},
): Promise<LiteraturePaper[]> {
  try {
    return await invoke<LiteraturePaper[]>('library_list_papers', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '读取文献列表失败'));
  }
}

export async function reorderLibraryPapers(
  request: ReorderPapersRequest,
): Promise<void> {
  try {
    await invoke('library_reorder_papers', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '保存文献排序失败'));
  }
}

export async function importPdfsToLibrary(
  request: ImportPdfRequest,
): Promise<ImportedPdfResult[]> {
  try {
    return await invoke<ImportedPdfResult[]>('library_import_pdfs', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '导入 PDF 失败'));
  }
}

export async function addAttachmentToPaper(request: {
  paperId: string;
  filePath: string;
  kind?: string;
}): Promise<LiteraturePaper> {
  try {
    return await invoke<LiteraturePaper>('library_add_attachment', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '添加附件失败'));
  }
}

export async function assignPaperToLibraryCategory(
  request: AssignPaperCategoryRequest,
): Promise<LiteraturePaper> {
  try {
    return await invoke<LiteraturePaper>('library_assign_paper_category', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '移动文献到分类失败'));
  }
}

export async function updateLibraryPaper(
  request: UpdatePaperRequest,
): Promise<LiteraturePaper> {
  try {
    return await invoke<LiteraturePaper>('library_update_paper', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '更新文献信息失败'));
  }
}

export async function deleteLibraryPaper(
  request: DeletePaperRequest,
): Promise<void> {
  try {
    await invoke('library_delete_paper', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '删除文献记录失败'));
  }
}

export async function deleteAllLibraryPapers(
  deleteFiles?: boolean,
): Promise<{ deletedCount: number }> {
  try {
    return await invoke<{ deletedCount: number }>('library_delete_all_papers', { request: { deleteFiles } });
  } catch (error) {
    throw new Error(toErrorMessage(error, '清空文献库失败'));
  }
}

export async function cleanupMissingLibraryPapers(): Promise<{
  deletedCount: number;
  deletedIds: string[];
}> {
  try {
    return await invoke<{ deletedCount: number; deletedIds: string[] }>('library_cleanup_missing_papers');
  } catch (error) {
    throw new Error(toErrorMessage(error, '清理缺失文献失败'));
  }
}

export async function deleteLibraryAttachment(request: {
  attachmentId: string;
  deleteFile?: boolean;
}): Promise<LiteraturePaper> {
  try {
    return await invoke<LiteraturePaper>('library_delete_attachment', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '删除附件失败'));
  }
}

export async function relocateLibraryAttachment(
  request: RelocateAttachmentRequest,
): Promise<LiteratureAttachment> {
  try {
    return await invoke<LiteratureAttachment>('library_relocate_attachment', { request });
  } catch (error) {
    throw new Error(toErrorMessage(error, '重新定位 PDF 文件失败'));
  }
}

export async function backfillEasyScholarMetadata(): Promise<{
  updatedCount: number;
  skippedCount: number;
}> {
  try {
    return await invoke<{ updatedCount: number; skippedCount: number }>('library_backfill_easyscholar');
  } catch (error) {
    throw new Error(toErrorMessage(error, '补全 EasyScholar 数据失败'));
  }
}
