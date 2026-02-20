import type { Message } from '../../types';
import { MessageCard } from '../detail/MessageCard';

interface ModifiedMessageProps {
  oldMessage: Message;
  newMessage: Message;
  expandedId?: string | null;
  onToggleExpand?: (id: string) => void;
}

export function ModifiedMessage({ oldMessage, newMessage, expandedId, onToggleExpand }: ModifiedMessageProps) {
  return (
    <div className="relative pl-6">
      {/* Orange/Yellow left border indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-full" />

      <div className="space-y-2">
        {/* Old message */}
        <div className="relative opacity-60">
          <div className="absolute -left-4 top-3 text-red-500 text-xs font-medium">-</div>
          <MessageCard
            message={oldMessage}
            isExpanded={expandedId === oldMessage.id}
            onToggleExpand={() => onToggleExpand?.(oldMessage.id)}
          />
        </div>

        {/* Arrow connector */}
        <div className="flex items-center justify-center py-1">
          <div className="text-text-muted text-sm">↓</div>
        </div>

        {/* New message */}
        <div className="relative">
          <div className="absolute -left-4 top-3 text-green-500 text-xs font-medium">+</div>
          <MessageCard
            message={newMessage}
            isExpanded={expandedId === newMessage.id}
            onToggleExpand={() => onToggleExpand?.(newMessage.id)}
          />
        </div>
      </div>
    </div>
  );
}
