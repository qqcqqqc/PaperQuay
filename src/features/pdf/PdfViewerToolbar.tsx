import { useRef, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  MousePointer2,
  PenTool,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  getPdfAnnotationColorValue,
  PDF_ANNOTATION_COLOR_PRESETS,
  type PdfAnnotationColorTool,
  type PdfAnnotationToolColors,
} from './annotationColors';
import {
  getPdfAnnotationColorLabel,
  getPercentProgress,
} from './pdfViewerUtils';

type Localize = (zh: string, en: string) => string;

export type AnnotationEditorTool = 'none' | 'freetext' | 'ink';

type ToolbarToolKey = 'select' | 'freetext' | 'ink';
type EditableToolbarToolKey = Exclude<ToolbarToolKey, 'select'>;

interface ToolbarTool {
  key: ToolbarToolKey;
  label: string;
  icon: ReactNode;
}

interface PdfViewerToolbarProps {
  activeColorTool: PdfAnnotationColorTool;
  annotationColors: PdfAnnotationToolColors;
  annotationFontSize: number;
  canShowReadingHeatmapBar: boolean;
  currentPage: number;
  documentError: string;
  editorTool: AnnotationEditorTool;
  enableReadingHeatmap: boolean;
  hasLiveTextSelection: boolean;
  hideToolbar: boolean;
  l: Localize;
  loading: boolean;
  onActiveColorToolChange: Dispatch<SetStateAction<PdfAnnotationColorTool>>;
  onAnnotationFontSizeChange: (size: number) => void;
  onAnnotationToolColorChange: (tool: PdfAnnotationColorTool, value: string) => void;
  onCreateHighlight: () => void | Promise<void>;
  onEditorToolChange: Dispatch<SetStateAction<AnnotationEditorTool>>;
  onScrollToPage: (pageIndex: number) => void;
  onToggleReadingHeatmapBar: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  pageCount: number;
  readingHeatmapToggleLabel: string;
  showReadingHeatmapBar: boolean;
  translating: boolean;
  translationProgressCompleted: number;
  translationProgressTotal: number;
  zoomLabel: string;
}

export function PdfViewerToolbar({
  activeColorTool,
  annotationColors,
  annotationFontSize,
  canShowReadingHeatmapBar,
  currentPage,
  documentError,
  editorTool,
  enableReadingHeatmap,
  hasLiveTextSelection,
  hideToolbar,
  l,
  loading,
  onActiveColorToolChange,
  onAnnotationFontSizeChange,
  onAnnotationToolColorChange,
  onCreateHighlight,
  onEditorToolChange,
  onScrollToPage,
  onToggleReadingHeatmapBar,
  onZoomIn,
  onZoomOut,
  pageCount,
  readingHeatmapToggleLabel,
  showReadingHeatmapBar,
  translating,
  translationProgressCompleted,
  translationProgressTotal,
  zoomLabel,
}: PdfViewerToolbarProps) {
  const activeToolColor = annotationColors[activeColorTool];
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const translationProgressRatio = getPercentProgress(
    translationProgressCompleted,
    translationProgressTotal,
  );
  const toolbarTools: ToolbarTool[] = [
    {
      key: 'select',
      label: l('选择联动', 'Select & Link'),
      icon: <MousePointer2 className="h-4 w-4" strokeWidth={1.8} />,
    },
    {
      key: 'freetext',
      label: l('文本', 'Text'),
      icon: <Type className="h-4 w-4" strokeWidth={1.8} />,
    },
    {
      key: 'ink',
      label: l('手写', 'Ink'),
      icon: <PenTool className="h-4 w-4" strokeWidth={1.8} />,
    },
  ];

  const getToolLabel = (key: ToolbarToolKey) => {
    if (key === 'select') return l('选择联动', 'Select & Link');
    if (key === 'freetext') return l('文本批注', 'Text Annotation');
    return l('手写批注', 'Ink Annotation');
  };

  return (
    <div className={cn(
      'border-b border-slate-200/80 bg-white/78 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[var(--pq-bg-primary)]',
      hideToolbar && 'hidden',
    )}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[var(--pq-surface-1)]">
          {toolbarTools.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                if (item.key === 'select') {
                  onEditorToolChange('none');
                  return;
                }

                const editableTool = item.key as EditableToolbarToolKey;
                
                // If clicking the same tool again, open color picker
                if (editorTool === editableTool) {
                  colorPickerRef.current?.click();
                } else {
                  onActiveColorToolChange(editableTool);
                  onEditorToolChange(editableTool);
                }
              }}
              disabled={loading}
              title={getToolLabel(item.key)}
              aria-label={getToolLabel(item.key)}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-slate-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55',
                (item.key === 'select' && editorTool === 'none') ||
                (item.key !== 'select' &&
                  editorTool === item.key)
                  ? 'border-indigo-200 bg-white text-indigo-600 shadow-[0_8px_18px_rgba(79,70,229,0.12)] dark:border-indigo-400/30 dark:bg-[var(--pq-surface-2)] dark:text-indigo-400 dark:shadow-[0_8px_18px_rgba(79,70,229,0.18)]'
                  : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:text-slate-800 dark:hover:border-white/15 dark:hover:bg-[var(--pq-surface-2)] dark:hover:text-[var(--pq-text)]',
              )}
            >
              {item.icon}
              {item.key !== 'select' && editorTool === item.key && (
                <div 
                  className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: activeToolColor }}
                />
              )}
            </button>
          ))}
          
          <input
            ref={colorPickerRef}
            type="color"
            value={activeToolColor}
            onChange={(e) => onAnnotationToolColorChange(activeColorTool, e.target.value)}
            className="sr-only"
          />

          {editorTool === 'freetext' && (
            <div className="ml-1 flex items-center gap-1.5 px-2 text-slate-400">
              <span className="text-[10px] font-bold">SIZE</span>
              <select
                value={annotationFontSize}
                onChange={(e) => onAnnotationFontSizeChange(Number(e.target.value))}
                className="h-7 rounded-lg border border-slate-200 bg-white px-1 text-xs font-medium text-slate-600 outline-none hover:border-slate-300 dark:border-white/10 dark:bg-[var(--pq-surface-2)] dark:text-[var(--pq-text-muted)]"
              >
                {[10, 12, 14, 16, 18, 20, 24, 28, 32, 48].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-faint)]">
            {l(`Page ${currentPage}/${Math.max(pageCount, 1)}`, `Page ${currentPage}/${Math.max(pageCount, 1)}`)}
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-faint)]">
            {zoomLabel}
          </div>
          <button
            type="button"
            onClick={() => onScrollToPage(Math.max(0, currentPage - 2))}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-muted)] dark:hover:bg-[var(--pq-surface-2)]"
            title={l('Previous page', 'Previous page')}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={() => onScrollToPage(Math.min(Math.max(pageCount - 1, 0), currentPage))}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-muted)] dark:hover:bg-[var(--pq-surface-2)]"
            title={l('Next page', 'Next page')}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-muted)] dark:hover:bg-[var(--pq-surface-2)]"
            title={l('缩小', 'Zoom out')}
          >
            <ZoomOut className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-muted)] dark:hover:bg-[var(--pq-surface-2)]"
            title={l('放大', 'Zoom in')}
          >
            <ZoomIn className="h-4 w-4" strokeWidth={1.8} />
          </button>
          {enableReadingHeatmap ? (
            <button
              type="button"
              onClick={onToggleReadingHeatmapBar}
              disabled={!canShowReadingHeatmapBar}
              className={cn(
                'inline-flex items-center rounded-xl border p-2 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55',
                showReadingHeatmapBar
                  ? 'border-[var(--pq-accent-border)] bg-[var(--pq-accent-bg)] text-[var(--pq-accent)] shadow-[0_8px_18px_var(--pq-accent-shadow)] dark:border-[var(--pq-accent-border)] dark:bg-[var(--pq-accent-bg)] dark:text-[var(--pq-accent-text)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-[var(--pq-surface-1)] dark:text-[var(--pq-text-muted)] dark:hover:bg-[var(--pq-surface-2)]',
              )}
              title={readingHeatmapToggleLabel}
              aria-label={readingHeatmapToggleLabel}
            >
              <Activity className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      </div>

      {documentError ? <div className="mt-2 text-xs text-rose-600">{documentError}</div> : null}
      {translating && translationProgressTotal > 0 ? (
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 dark:border-indigo-400/20 dark:bg-indigo-400/10">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-indigo-700 dark:text-indigo-400">
            <span>{l('MinerU block translation progress', 'MinerU block translation progress')}</span>
            <span>
              {translationProgressCompleted}/{translationProgressTotal}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/20">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300 dark:bg-indigo-400"
              style={{ width: `${translationProgressRatio}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
