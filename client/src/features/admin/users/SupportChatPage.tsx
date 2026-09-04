import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/api/support';
import { apiErrorMessage } from '@/api/axiosClient';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/store/toastStore';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';
import { IconChat, IconSend } from '@/components/ui/icons';

export function SupportChatPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['support-threads'],
    queryFn: () => supportApi.threads({ pageSize: 100 }),
    refetchInterval: 6000,
  });

  useEffect(() => {
    if (!selectedAgentId && threads?.items.length) setSelectedAgentId(threads.items[0].agent.id);
  }, [threads, selectedAgentId]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['support-messages', selectedAgentId],
    queryFn: () => supportApi.messages({ agentId: selectedAgentId!, pageSize: 100 }),
    enabled: Boolean(selectedAgentId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.items.length]);

  const sendMut = useMutation({
    mutationFn: (message: string) => supportApi.send({ message, agentId: selectedAgentId! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-messages', selectedAgentId] });
      qc.invalidateQueries({ queryKey: ['support-threads'] });
      setText('');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !selectedAgentId) return;
    sendMut.mutate(trimmed);
  }

  const selectedThread = threads?.items.find((t) => t.agent.id === selectedAgentId);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader title="Support Chat" description="Every agent's support thread — a reply from any admin is shared across the whole team." />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col overflow-hidden lg:col-span-1">
          <div className="overflow-y-auto">
            {threadsLoading ? (
              <p className="p-4 text-center text-sm text-slate-500">Loading…</p>
            ) : !threads?.items.length ? (
              <EmptyState title="No support messages yet" icon={<IconChat className="h-8 w-8" />} />
            ) : (
              threads.items.map((t) => (
                <button
                  key={t.agent.id}
                  onClick={() => setSelectedAgentId(t.agent.id)}
                  className={cn(
                    'flex w-full items-start gap-2 border-b border-white/8 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]',
                    selectedAgentId === t.agent.id && 'bg-emerald-500/10',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-100">{t.agent.name}</p>
                      {t.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-neutral-950">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{t.lastMessage.message}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">{t.agent.referralCode}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden lg:col-span-2">
          {!selectedAgentId ? (
            <EmptyState title="Select a conversation" description="Pick an agent on the left to view their thread." icon={<IconChat className="h-8 w-8" />} />
          ) : (
            <>
              <div className="border-b border-white/8 px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">{selectedThread?.agent.name ?? '—'}</p>
                <p className="font-mono text-xs text-slate-500">{selectedThread?.agent.referralCode}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
                ) : (
                  messages?.items.map((m) => {
                    const mine = m.senderId === user?.id || m.sender?.role === 'SUPER_ADMIN';
                    return (
                      <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                        <div className={mine ? 'max-w-[75%] rounded-2xl rounded-br-sm bg-amber-500/15 px-3.5 py-2' : 'max-w-[75%] rounded-2xl rounded-bl-sm bg-white/[0.05] px-3.5 py-2'}>
                          {!mine && <p className="mb-0.5 text-[11px] font-medium text-slate-400">{m.sender?.name}</p>}
                          <p className="whitespace-pre-wrap text-sm text-slate-100">{m.message}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{formatDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/8 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reply…"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-amber-500/50 focus:bg-white/[0.05]"
                />
                <Button type="submit" icon={<IconSend className="h-4 w-4" />} loading={sendMut.isPending} disabled={!text.trim()}>
                  Send
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
