import { X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface PdfFindBarProps {
  show: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  onFind: (query: string, direction: 'next' | 'previous') => void;
  matchCount: { current: number; total: number };
  status: 'pending' | 'found' | 'not-found' | 'wrapped';
  l: (zh: string, en: string) => string;
}

export function PdfFindBar({
  show,
  onClose,
  query,
  onQueryChange,
  onFind,
  matchCount,
  status,
  l,
}: PdfFindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="absolute right-8 top-16 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[var(--pq-surface-2)]">
      <div className="flex items-center gap-2 px-1">
        <Search className="h-4 w-4 text-slate-400" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onFind(query, e.shiftKey ? 'previous' : 'next');
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder={l('搜索文本...', 'Search text...')}
          className="w-48 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-[var(--pq-text)]"
        />
        {query && (
          <span className={cn(
            "text-[11px] font-medium tabular-nums min-w-[3rem] text-right",
            status === 'not-found' ? "text-rose-500" : "text-slate-400"
          )}>
            {status === 'not-found' ? l('未找到', 'Not found') : `${matchCount.current}/${matchCount.total}`}
          </span>
        )}
      </div>

      <div className="flex items-center border-l border-slate-100 pl-1 dark:border-white/5">
        <button
          onClick={() => onFind(query, 'previous')}
          title={l('上一个', 'Previous')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => onFind(query, 'next')}
          title={l('下一个', 'Next')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          title={l('关闭', 'Close')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
