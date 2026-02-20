import type { Request } from '../../types';
import { ThemeToggle } from '../ThemeToggle';

interface RequestHeaderProps {
  request: Request;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function RequestHeader({ request }: RequestHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-border-default bg-bg-secondary">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Request ID */}
        <code className="text-sm font-mono text-text-primary font-medium">
          {request.id.slice(0, 12)}...
        </code>

        {/* Divider */}
        <span className="text-border-default">│</span>

        {/* Model */}
        <span className="text-sm text-text-secondary">
          Model: <span className="text-text-primary font-medium">{request.model}</span>
        </span>

        {/* Divider */}
        <span className="text-border-default">│</span>

        {/* Timestamp */}
        <span className="text-sm font-mono text-text-muted">
          {formatTimestamp(request.timestamp)}
        </span>

        {/* Theme Toggle */}
        <div className="ml-auto">
          <ThemeToggle />
        </div>

        {/* Duration */}
        <span className="text-xs font-mono px-2 py-1 rounded bg-bg-tertiary text-text-secondary">
          {request.duration_ms}ms
        </span>
      </div>
    </div>
  );
}
