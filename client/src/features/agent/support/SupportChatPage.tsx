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
import { formatDateTime } from '@/utils/format';
import { IconChat, IconSend } from '@/components/ui/icons';

export function SupportChatPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['support-messages', 'me'],
    queryFn: () => supportApi.messages({ pageSize: 100 }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.items.length]);

  const sendMut = useMutation({
    mutationFn: (message: string) => supportApi.send({ message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-messages'] });
      setText('');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMut.mutate(trimmed);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader title="Support" description="Message the admin team — replies usually land here within a few minutes." />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : !data?.items.length ? (
            <EmptyState title="No messages yet" description="Send a message and an admin will get back to you." icon={<IconChat className="h-8 w-8" />} />
          ) : (
            data.items.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={mine ? 'max-w-[75%] rounded-2xl rounded-br-sm bg-emerald-500/15 px-3.5 py-2' : 'max-w-[75%] rounded-2xl rounded-bl-sm bg-white/[0.05] px-3.5 py-2'}>
                    {!mine && <p className="mb-0.5 text-[11px] font-medium text-emerald-300/80">{m.sender?.name ?? 'Admin'}</p>}
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
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-emerald-500/50 focus:bg-white/[0.05]"
          />
          <Button type="submit" accent="emerald" icon={<IconSend className="h-4 w-4" />} loading={sendMut.isPending} disabled={!text.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
