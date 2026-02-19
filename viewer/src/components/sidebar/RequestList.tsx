import type { Request } from '../../types';
import { RequestListItem } from './RequestListItem';

interface RequestListProps {
  requests: Request[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RequestList({ requests, selectedId, onSelect }: RequestListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <h1 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Trace Requests
        </h1>
        <p className="text-xs text-text-muted mt-1">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="px-4 py-8 text-center text-text-muted text-sm">
            No requests found
          </div>
        ) : (
          <div className="divide-y divide-border-muted">
            {requests.map((request) => (
              <RequestListItem
                key={request.id}
                request={request}
                isSelected={selectedId === request.id}
                onClick={() => onSelect(request.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
