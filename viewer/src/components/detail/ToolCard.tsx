import { useState } from 'react';
import type { Tool } from '../../types';

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border-default bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="font-mono text-sm font-medium text-text-primary">
          {tool.name}
        </div>
        {tool.description && (
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            {tool.description}
          </p>
        )}
      </div>

      {/* Parameter Schema Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 border-t border-border-muted bg-bg-tertiary/50 flex items-center justify-between text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <span>Parameter schema</span>
        <span className={`transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Parameters */}
      {expanded && (
        <pre className="px-4 py-3 border-t border-border-muted text-xs font-mono text-text-secondary overflow-x-auto bg-bg-primary/30">
          {JSON.stringify(tool.parameters, null, 2)}
        </pre>
      )}
    </div>
  );
}
