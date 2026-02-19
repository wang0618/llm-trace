import type { Message } from '../../types';

interface MessageCardProps {
  message: Message;
}

const roleConfig: Record<Message['role'], { label: string; colorClass: string; bgClass: string }> = {
  system: {
    label: 'system',
    colorClass: 'text-role-system',
    bgClass: 'bg-role-system/10 border-role-system/30',
  },
  user: {
    label: 'user',
    colorClass: 'text-role-user',
    bgClass: 'bg-role-user/10 border-role-user/30',
  },
  assistant: {
    label: 'assistant',
    colorClass: 'text-role-assistant',
    bgClass: 'bg-role-assistant/10 border-role-assistant/30',
  },
  tool_use: {
    label: 'tool_use',
    colorClass: 'text-role-tool-use',
    bgClass: 'bg-role-tool-use/10 border-role-tool-use/30',
  },
  tool_result: {
    label: 'tool_result',
    colorClass: 'text-role-tool-result',
    bgClass: 'bg-role-tool-result/10 border-role-tool-result/30',
  },
};

export function MessageCard({ message }: MessageCardProps) {
  const config = roleConfig[message.role];

  return (
    <div className={`rounded-lg border ${config.bgClass} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-inherit flex items-center gap-2">
        <span className={`text-xs font-mono font-medium uppercase ${config.colorClass}`}>
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {message.content && (
          <div className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>
        )}

        {/* Tool Calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.tool_calls.map((call, idx) => (
              <div
                key={idx}
                className="rounded bg-bg-primary/50 border border-border-muted overflow-hidden"
              >
                <div className="px-3 py-1.5 bg-bg-tertiary border-b border-border-muted">
                  <span className="font-mono text-xs text-role-tool-use font-medium">
                    {call.name}
                  </span>
                </div>
                <pre className="px-3 py-2 text-xs font-mono text-text-secondary overflow-x-auto">
                  {JSON.stringify(call.arguments, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
