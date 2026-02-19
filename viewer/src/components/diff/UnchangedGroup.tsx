import { useState, useCallback } from 'react';
import type { Message } from '../../types';
import { MessageCard } from '../detail/MessageCard';

interface UnchangedGroupProps {
  groupId: number;
  messages: Message[];
  expandedMessageId?: string | null;
  onToggleExpand?: (id: string) => void;
}

export function UnchangedGroup({ groupId, messages, expandedMessageId, onToggleExpand }: UnchangedGroupProps) {
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);

  const label = messages.length === 1 ? '1 unchanged message' : `${messages.length} unchanged messages`;
  const anchorId = `unchanged-anchor-${groupId}`;

  const handleExpand = useCallback(() => {
    setIsGroupExpanded(true);
    // After React renders, scroll to the anchor to maintain viewport position
    requestAnimationFrame(() => {
      const anchor = document.getElementById(anchorId);
      if (anchor) {
        // Use hash navigation to scroll to anchor
        window.location.hash = anchorId;
      }
    });
  }, [anchorId]);

  const handleCollapse = useCallback(() => {
    setIsGroupExpanded(false);
    // Clear hash after collapsing
    if (window.location.hash === `#${anchorId}`) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [anchorId]);

  // Collapsed view (default)
  if (!isGroupExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="w-full py-3 px-4 text-sm text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg border border-dashed border-border-muted transition-colors"
      >
        <span className="font-mono">···</span>
        <span className="ml-2">{label}</span>
      </button>
    );
  }

  // Expanded view
  return (
    <div className="space-y-3">
      <button
        onClick={handleCollapse}
        className="w-full py-2 px-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Collapse {label}
      </button>

      {messages.map((message) => (
        <div key={message.id} className="opacity-70">
          <MessageCard
            message={message}
            isExpanded={expandedMessageId === message.id}
            onToggleExpand={() => onToggleExpand?.(message.id)}
          />
        </div>
      ))}

      {/* Anchor for scroll position preservation */}
      <div id={anchorId} className="scroll-mt-4" />

      <button
        onClick={handleCollapse}
        className="w-full py-2 px-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Collapse
      </button>
    </div>
  );
}
