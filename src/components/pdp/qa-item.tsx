"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Flag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/utils/dates";
import type { AnswerView, QuestionView } from "@/lib/reviews/types";

async function postJson<T>(url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string; status: number }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!res.ok) return { ok: false, message: data?.error?.message ?? "Something went wrong", status: res.status };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: "Network error. Please try again.", status: 0 };
  }
}

export function useReport() {
  const { toast } = useToast();
  return React.useCallback(
    async (kind: "question" | "answer", id: string) => {
      if (!window.confirm(`Report this ${kind} as inappropriate?`)) return false;
      const r = await postJson<{ reported: boolean }>(`/api/${kind}s/${id}/report`);
      if (r.ok) toast({ title: "Thanks for reporting", description: "Our team will take a look.", tone: "success" });
      else toast({ title: r.message, tone: "error" });
      return r.ok;
    },
    [toast],
  );
}

export function QaItem({
  question,
  isLoggedIn,
  onAnswer,
  onHide,
  onHideAnswer,
}: {
  question: QuestionView;
  isLoggedIn: boolean;
  onAnswer: (questionId: string, answer: AnswerView) => void;
  onHide: (questionId: string) => void;
  onHideAnswer: (questionId: string, answerId: string) => void;
}) {
  const [answering, setAnswering] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const report = useReport();
  const router = useRouter();

  const submit = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await postJson<AnswerView>(`/api/questions/${question.id}/answers`, { body: draft });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onAnswer(question.id, r.data);
    setDraft("");
    setAnswering(false);
    toast({ title: "Answer posted", tone: "success" });
  };

  return (
    <li className="py-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-surface px-1.5 text-xs font-bold text-text-secondary" aria-hidden>
          Q
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">{question.body}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {question.authorName} · {timeAgo(question.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void report("question", question.id).then((ok) => ok && onHide(question.id))}
          aria-label="Report question"
          className="rounded-full p-2 text-text-tertiary hover:bg-surface min-h-0"
        >
          <Flag className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 space-y-2 pl-7">
        {question.answers.map((a) => (
          <li key={a.id} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 rounded bg-primary-soft px-1.5 text-xs font-bold text-primary" aria-hidden>
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-secondary">{a.body}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
                {a.brandName ? (
                  <Badge tone="secondary" className="min-h-0">
                    <Store className="h-3 w-3" aria-hidden /> {a.brandName}
                  </Badge>
                ) : (
                  a.authorName
                )}
                · {timeAgo(a.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void report("answer", a.id).then((ok) => ok && onHideAnswer(question.id, a.id))}
              aria-label="Report answer"
              className="rounded-full p-2 text-text-tertiary hover:bg-surface min-h-0"
            >
              <Flag className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {question.answers.length === 0 && !answering && <li className="text-xs text-text-tertiary">No answers yet.</li>}
      </ul>
      <div className="mt-2 pl-7">
        {answering ? (
          <div className="space-y-2">
            <Textarea aria-label="Your answer" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="Share what you know" className="[&>textarea]:min-h-20" error={error ?? undefined} />
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} loading={busy} disabled={draft.trim().length < 5}>
                Post answer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAnswering(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="link" size="sm" onClick={() => (isLoggedIn ? setAnswering(true) : submit())}>
            Answer this question
          </Button>
        )}
      </div>
    </li>
  );
}
