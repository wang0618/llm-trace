import type { Request } from '../../types';

interface RequestListItemProps {
  request: Request;
  isSelected: boolean;
  onClick: () => void;
}

function getRequestIcon(model: string): string {
  if (model.includes('gpt-4')) return '◆';
  if (model.includes('gpt-3')) return '◇';
  if (model.includes('claude')) return '●';
  return '○';
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-3 text-left
        border-l-2 transition-all duration-fast
        hover:bg-bg-tertiary
        ${isSelected
          ? 'bg-bg-tertiary border-l-border-accent'
          : 'border-l-transparent'
        }
      `}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Time and Icon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-text-muted text-sm font-mono">
            {getRequestIcon(request.model)}
          </span>
          <span className="text-text-secondary text-sm font-mono truncate">
            {formatTime(request.timestamp)}
          </span>
        </div>

        {/* Duration */}
        <span className={`
          text-xs font-mono px-2 py-0.5 rounded
          ${request.duration_ms > 5000
            ? 'bg-warning/20 text-warning'
            : 'bg-bg-primary text-text-muted'
          }
        `}>
          {formatDuration(request.duration_ms)}
        </span>
      </div>

      {/* Model name subtitle */}
      <div className="mt-1 text-xs text-text-muted truncate pl-5">
        {request.model}
      </div>
    </button>
  );
}
