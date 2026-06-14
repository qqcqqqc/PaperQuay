import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, X } from 'lucide-react';
import { useLocaleText } from '../../i18n/uiLanguage';
import type { ClientAnchorRect, SelectedExcerpt } from '../../types/reader';
import { MarkdownPreview } from './assistantSidebarPrimitives';

function clampSelectionPopoverPosition(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeAnchorRect(rect: ClientAnchorRect | undefined): ClientAnchorRect | undefined {
  if (
    !rect ||
    !isFiniteNumber(rect.left) ||
    !isFiniteNumber(rect.top) ||
    !isFiniteNumber(rect.width) ||
    !isFiniteNumber(rect.height)
  ) {
    return undefined;
  }

  return rect;
}

const POPOVER_VIEWPORT_MARGIN = 16;
const POPOVER_ANCHOR_GAP = 12;
const FALLBACK_POPOVER_WIDTH = 360;
const FALLBACK_POPOVER_HEIGHT = 260;

function getRectOverlapArea(
  left: number,
  top: number,
  width: number,
  height: number,
  anchorRect: ClientAnchorRect,
) {
  const overlapWidth = Math.max(
    0,
    Math.min(left + width, anchorRect.left + anchorRect.width) - Math.max(left, anchorRect.left),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(top + height, anchorRect.top + anchorRect.height) - Math.max(top, anchorRect.top),
  );

  return overlapWidth * overlapHeight;
}

function resolveAnchorRectPopoverPosition({
  anchorRect,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
}: {
  anchorRect: ClientAnchorRect;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const viewportMinLeft = POPOVER_VIEWPORT_MARGIN;
  const viewportMinTop = POPOVER_VIEWPORT_MARGIN;
  const viewportMaxLeft = viewportWidth - POPOVER_VIEWPORT_MARGIN - panelWidth;
  const viewportMaxTop = viewportHeight - POPOVER_VIEWPORT_MARGIN - panelHeight;
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const candidates = [
    {
      priority: 0,
      left: anchorRect.left + anchorRect.width + POPOVER_ANCHOR_GAP,
      top: anchorCenterY - panelHeight / 2,
    },
    {
      priority: 1,
      left: anchorRect.left - panelWidth - POPOVER_ANCHOR_GAP,
      top: anchorCenterY - panelHeight / 2,
    },
    {
      priority: 2,
      left: anchorCenterX - panelWidth / 2,
      top: anchorRect.top + anchorRect.height + POPOVER_ANCHOR_GAP,
    },
    {
      priority: 3,
      left: anchorCenterX - panelWidth / 2,
      top: anchorRect.top - panelHeight - POPOVER_ANCHOR_GAP,
    },
  ].map((candidate) => {
    const left = clampSelectionPopoverPosition(candidate.left, viewportMinLeft, viewportMaxLeft);
    const top = clampSelectionPopoverPosition(candidate.top, viewportMinTop, viewportMaxTop);

    return {
      ...candidate,
      left,
      top,
      overlapArea: getRectOverlapArea(left, top, panelWidth, panelHeight, anchorRect),
      clampDistance: Math.abs(left - candidate.left) + Math.abs(top - candidate.top),
    };
  });

  candidates.sort((left, right) => {
    if (left.overlapArea !== right.overlapArea) {
      return left.overlapArea - right.overlapArea;
    }

    if (left.clampDistance !== right.clampDistance) {
      return left.clampDistance - right.clampDistance;
    }

    return left.priority - right.priority;
  });

  return {
    left: candidates[0]?.left ?? viewportMinLeft,
    top: candidates[0]?.top ?? viewportMinTop,
  };
}

export interface SelectionQuickActionsProps {
  selectedExcerpt: SelectedExcerpt | null;
  selectedExcerptTranslation: string;
  selectedExcerptTranslating: boolean;
  selectedExcerptError: string;
  aiConfigured: boolean;
  autoTranslateSelection: boolean;
  onAppendSelectedExcerptToQa: () => void;
  onAddSelectionToNote: () => void;
  onTranslateSelectedExcerpt: () => void;
  onClearSelectedExcerpt: () => void;
  onQuickHighlight?: (colorHex: string) => void;
}

export function SelectionQuickActions({
  selectedExcerpt,
  selectedExcerptTranslation,
  selectedExcerptTranslating,
  selectedExcerptError,
  aiConfigured,
  autoTranslateSelection,
  onAppendSelectedExcerptToQa,
  onAddSelectionToNote,
  onTranslateSelectedExcerpt,
  onClearSelectedExcerpt,
  onQuickHighlight,
}: SelectionQuickActionsProps) {
  const l = useLocaleText();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const isInteractingRef = useRef(false);

  const [offsetPosition, setOffsetPosition] = useState<{ left: number; top: number } | null>(null);
  const [popoverSize, setPopoverSize] = useState({
    width: FALLBACK_POPOVER_WIDTH,
    height: FALLBACK_POPOVER_HEIGHT,
  });
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null);

  const MIN_POPOVER_WIDTH = 280;
  const MIN_POPOVER_HEIGHT = 200;

  const handleDragStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    isInteractingRef.current = true;

    // 直接从 DOM 读取当前实际位置，避免第一次拖动时 offsetPosition 为 null 导致瞬移
    const domRect = popoverRef.current?.getBoundingClientRect();
    const startLeft = domRect?.left ?? 0;
    const startTop = domRect?.top ?? 0;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: startLeft,
      top: startTop,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffsetPosition({
        left: dragStartRef.current.left + dx,
        top: dragStartRef.current.top + dy,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      dragStartRef.current = null;
      // Use a small timeout to clear interacting state to ensure it covers the subsequent click event
      setTimeout(() => {
        isInteractingRef.current = false;
      }, 50);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
  }, []);

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    isInteractingRef.current = true;

    const currentWidth = dragSize?.width ?? popoverSize.width;
    const currentHeight = dragSize?.height ?? popoverSize.height;
    resizeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      width: currentWidth,
      height: currentHeight,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const newWidth = Math.max(MIN_POPOVER_WIDTH, resizeStartRef.current.width + dx);
      const newHeight = Math.max(MIN_POPOVER_HEIGHT, resizeStartRef.current.height + dy);
      setDragSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      resizeStartRef.current = null;
      setTimeout(() => {
        isInteractingRef.current = false;
      }, 50);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
  }, [popoverSize, dragSize]);

  useEffect(() => {
    if (!selectedExcerpt) {
      return undefined;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (isInteractingRef.current) {
        return;
      }

      if (Date.now() - selectedExcerpt.createdAt < 500) {
        return;
      }

      if ((event as MouseEvent & { paperQuayPdfBlockSelectClick?: boolean }).paperQuayPdfBlockSelectClick) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (popoverRef.current?.contains(target)) {
        return;
      }

      if (
        selectedExcerpt.origin === 'pdf-block' &&
        target instanceof Element &&
        target.closest('.paperquay-pdf-linked')
      ) {
        return;
      }

      if (window.getSelection()?.toString().trim()) {
        return;
      }

      onClearSelectedExcerpt();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClearSelectedExcerpt();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClearSelectedExcerpt, selectedExcerpt]);

  useLayoutEffect(() => {
    if (!selectedExcerpt || !popoverRef.current) {
      return undefined;
    }

    const updatePopoverSize = () => {
      const rect = popoverRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const nextWidth = Math.ceil(rect.width);
      const nextHeight = Math.ceil(rect.height);

      setPopoverSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : {
              width: nextWidth,
              height: nextHeight,
            },
      );
    };

    updatePopoverSize();

    const resizeObserver = new ResizeObserver(updatePopoverSize);
    resizeObserver.observe(popoverRef.current);
    window.addEventListener('resize', updatePopoverSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePopoverSize);
    };
  }, [
    selectedExcerpt,
    selectedExcerptError,
    selectedExcerptTranslation,
    selectedExcerptTranslating,
  ]);

  if (!selectedExcerpt) {
    return null;
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const panelWidth = Math.min(popoverSize.width, viewportWidth - POPOVER_VIEWPORT_MARGIN * 2);
  const panelHeight = Math.min(popoverSize.height, viewportHeight - POPOVER_VIEWPORT_MARGIN * 2);
  const isPdfBlockExcerpt = selectedExcerpt.origin === 'pdf-block';
  const anchorClientRect = normalizeAnchorRect(selectedExcerpt.anchorClientRect);
  const fallbackAnchorClientX =
    anchorClientRect ? anchorClientRect.left + anchorClientRect.width / 2 : viewportWidth / 2;
  const fallbackAnchorClientY =
    anchorClientRect
      ? selectedExcerpt.placement === 'top'
        ? anchorClientRect.top
        : anchorClientRect.top + anchorClientRect.height
      : viewportHeight / 2;
  const anchorClientX = isFiniteNumber(selectedExcerpt.anchorClientX)
    ? selectedExcerpt.anchorClientX
    : fallbackAnchorClientX;
  const anchorClientY = isFiniteNumber(selectedExcerpt.anchorClientY)
    ? selectedExcerpt.anchorClientY
    : fallbackAnchorClientY;
  const anchorRectPosition =
    anchorClientRect
      ? resolveAnchorRectPopoverPosition({
          anchorRect: anchorClientRect,
          panelWidth,
          panelHeight,
          viewportWidth,
          viewportHeight,
        })
      : null;
  const availableBelow = viewportHeight - anchorClientY - POPOVER_VIEWPORT_MARGIN;
  const availableAbove = anchorClientY - POPOVER_VIEWPORT_MARGIN;
  const placeAbove =
    availableBelow < panelHeight + POPOVER_ANCHOR_GAP &&
    availableAbove > availableBelow;
  const fallbackLeft = clampSelectionPopoverPosition(
    anchorClientX - panelWidth / 2,
    POPOVER_VIEWPORT_MARGIN,
    viewportWidth - POPOVER_VIEWPORT_MARGIN - panelWidth,
  );
  const fallbackTop = clampSelectionPopoverPosition(
    placeAbove
      ? anchorClientY - panelHeight - POPOVER_ANCHOR_GAP
      : anchorClientY + POPOVER_ANCHOR_GAP,
    POPOVER_VIEWPORT_MARGIN,
    viewportHeight - POPOVER_VIEWPORT_MARGIN - panelHeight,
  );
  const effectiveLeft = offsetPosition ? offsetPosition.left : (anchorRectPosition?.left ?? fallbackLeft);
  const effectiveTop = offsetPosition ? offsetPosition.top : (anchorRectPosition?.top ?? fallbackTop);
  const effectiveWidth = dragSize?.width ?? Math.min(popoverSize.width, viewportWidth - POPOVER_VIEWPORT_MARGIN * 2);
  const effectiveHeight = dragSize?.height;
  const sourceLabel = isPdfBlockExcerpt
    ? l('PDF 段落', 'PDF Paragraph')
    : selectedExcerpt.source === 'pdf'
      ? l('PDF 划词', 'PDF Selection')
      : l('正文划词', 'Block Selection');
  const translationTitle = isPdfBlockExcerpt
    ? l('段落译文', 'Paragraph Translation')
    : l('划词翻译', 'Selection Translation');
  const translationLabel = selectedExcerptTranslating
    ? isPdfBlockExcerpt
      ? l('正在翻译当前段落...', 'Translating this paragraph...')
      : l('正在翻译选中文本...', 'Translating the selected text...')
    : selectedExcerptError
      ? selectedExcerptError
      : selectedExcerptTranslation.trim()
        ? selectedExcerptTranslation
        : isPdfBlockExcerpt
          ? aiConfigured
            ? l(
                '当前段落还没有缓存译文。可以先运行全文翻译，或点击“立即翻译”单独翻译这段。',
                'This paragraph has no cached translation yet. Run full translation first, or click “Translate Now” for this paragraph.',
              )
            : l(
                '当前段落还没有缓存译文。请先运行全文翻译，或在设置中配置模型后单独翻译。',
                'This paragraph has no cached translation yet. Run full translation first, or configure a model to translate it separately.',
              )
        : aiConfigured
          ? autoTranslateSelection
            ? l(
                '已捕获划词内容，稍后会在这里显示译文。',
                'The selected text has been captured. Its translation will appear here shortly.',
              )
            : l(
                '已捕获划词内容，点击“立即翻译”获取译文。',
                'The selected text has been captured. Click “Translate Now” to get the translation.',
              )
          : l(
              'AI 服务尚未配置，请先在设置中完成模型配置。',
              'AI service is not configured yet. Complete the model setup in Preferences first.',
            );

  const popover = (
    <div
      className="pointer-events-none fixed z-[10000]"
      style={{
        left: effectiveLeft,
        top: effectiveTop,
        width: effectiveWidth,
      }}
    >
      <div
        ref={popoverRef}
        className="pointer-events-auto flex flex-col rounded-[20px] border border-slate-200/80 bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl overflow-hidden"
        style={{
          maxHeight: effectiveHeight ?? `calc(100vh - ${POPOVER_VIEWPORT_MARGIN * 2}px)`,
          minWidth: `${MIN_POPOVER_WIDTH}px`,
          height: effectiveHeight ?? undefined,
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          className="flex cursor-grab items-center justify-between gap-3 rounded-t-[20px] px-3 pb-0 pt-3 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 text-slate-400">
            <GripHorizontal className="h-4 w-4" strokeWidth={1.9} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {sourceLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onClearSelectedExcerpt}
            className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600"
            aria-label={l('关闭划词浮层', 'Close selection popover')}
          >
            <X className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-0">
          <div className="mt-3 flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
            <div className="mb-1 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {translationTitle}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto text-sm leading-6 text-slate-700">
              <MarkdownPreview
                content={translationLabel}
                className="text-sm leading-6 text-slate-700 [&_.katex-display]:my-1 [&_p]:my-0 [&_p]:leading-6"
              />
            </div>
          </div>

          {onQuickHighlight && selectedExcerpt?.source === 'pdf' ? (
            <div className="mt-3 shrink-0">
              <div className="flex items-center gap-2">
                {['#fef08a', '#86efac', '#99f6e4', '#f9a8d4', '#fca5a5'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onQuickHighlight(hex)}
                    className="h-7 w-7 rounded-full border-2 border-white shadow-sm transition-transform duration-150 hover:scale-110 hover:shadow-md"
                    style={{ backgroundColor: hex }}
                    title={hex}
                    aria-label={`${l('高亮颜色', 'Highlight color')}: ${hex}`}
                  />
                ))}
                <div className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-white shadow-sm transition-transform duration-150 hover:scale-110 hover:shadow-md">
                  <input
                    type="color"
                    className="absolute -inset-1 h-[150%] w-[150%] cursor-pointer border-none bg-transparent p-0"
                    onChange={(e) => onQuickHighlight(e.target.value)}
                    title={l('自定义颜色', 'Custom color')}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/50">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-indigo-400 via-pink-400 to-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 pb-3">
            <button
              type="button"
              onClick={onAppendSelectedExcerptToQa}
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800"
            >
              {l('加入问答', 'Add to QA')}
            </button>
            <button
              type="button"
              onClick={onAddSelectionToNote}
              className="inline-flex items-center rounded-xl border border-[var(--pq-accent-border)] bg-[var(--pq-accent-bg)] px-3 py-2 text-sm font-medium text-[var(--pq-accent)] transition-all duration-200 hover:bg-[var(--pq-accent-bg-hover)]"
            >
              {l('加入笔记', 'Add to Note')}
            </button>
            <button
              type="button"
              onClick={onTranslateSelectedExcerpt}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
            >
              {selectedExcerptTranslation.trim()
                ? l('重新翻译', 'Translate Again')
                : l('立即翻译', 'Translate Now')}
            </button>
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="flex cursor-nwse-resize items-center justify-end rounded-b-[20px] px-3 pb-1 text-slate-300 hover:text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12L12 2M2 8L8 2M6 12L12 6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(popover, document.body);
}
