import type { DiffResult, Message } from '../../types';
import { AddedMessage } from './AddedMessage';
import { DeletedMessage } from './DeletedMessage';
import { ModifiedMessage } from './ModifiedMessage';
import { UnchangedGroup } from './UnchangedGroup';

interface DiffViewProps {
  diff: DiffResult;
  expandedMessageId: string | null;
  onToggleExpand: (id: string) => void;
}

interface GroupedDiffItem {
  type: 'single' | 'unchanged-group';
  items: DiffResult['items'];
}

/**
 * Groups consecutive unchanged items together for collapsing
 */
function groupDiffItems(items: DiffResult['items']): GroupedDiffItem[] {
  const groups: GroupedDiffItem[] = [];
  let currentUnchangedGroup: DiffResult['items'] = [];

  const flushUnchangedGroup = () => {
    if (currentUnchangedGroup.length > 0) {
      groups.push({ type: 'unchanged-group', items: [...currentUnchangedGroup] });
      currentUnchangedGroup = [];
    }
  };

  for (const item of items) {
    if (item.type === 'unchanged') {
      currentUnchangedGroup.push(item);
    } else {
      flushUnchangedGroup();
      groups.push({ type: 'single', items: [item] });
    }
  }

  flushUnchangedGroup();

  return groups;
}

export function DiffView({ diff, expandedMessageId, onToggleExpand }: DiffViewProps) {
  const groupedItems = groupDiffItems(diff.items);

  if (diff.items.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        No messages in this request
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Summary badge */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
        {diff.summary.added > 0 && (
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded">
            +{diff.summary.added} added
          </span>
        )}
        {diff.summary.deleted > 0 && (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded">
            -{diff.summary.deleted} deleted
          </span>
        )}
        {diff.summary.modified > 0 && (
          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded">
            ~{diff.summary.modified} modified
          </span>
        )}
        {diff.summary.unchanged > 0 && (
          <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted rounded">
            {diff.summary.unchanged} unchanged
          </span>
        )}
      </div>

      {/* Diff items */}
      {groupedItems.map((group, groupIdx) => {
        if (group.type === 'unchanged-group') {
          const messages = group.items
            .map((item) => item.oldMessage)
            .filter((m): m is Message => m !== undefined);

          return (
            <UnchangedGroup
              key={`unchanged-${groupIdx}`}
              groupId={groupIdx}
              messages={messages}
              expandedMessageId={expandedMessageId}
              onToggleExpand={onToggleExpand}
            />
          );
        }

        // Single item (added, deleted, or modified)
        const item = group.items[0];

        if (item.type === 'added' && item.newMessage) {
          return (
            <AddedMessage
              key={`added-${groupIdx}-${item.newMessage.id}`}
              message={item.newMessage}
              isExpanded={expandedMessageId === item.newMessage.id}
              onToggleExpand={() => onToggleExpand(item.newMessage!.id)}
            />
          );
        }

        if (item.type === 'deleted' && item.oldMessage) {
          return (
            <DeletedMessage
              key={`deleted-${groupIdx}-${item.oldMessage.id}`}
              message={item.oldMessage}
              isExpanded={expandedMessageId === item.oldMessage.id}
              onToggleExpand={() => onToggleExpand(item.oldMessage!.id)}
            />
          );
        }

        if (item.type === 'modified' && item.oldMessage && item.newMessage) {
          return (
            <ModifiedMessage
              key={`modified-${groupIdx}-${item.oldMessage.id}-${item.newMessage.id}`}
              oldMessage={item.oldMessage}
              newMessage={item.newMessage}
              expandedId={expandedMessageId}
              onToggleExpand={onToggleExpand}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
