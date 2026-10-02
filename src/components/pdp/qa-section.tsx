"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { AnswerView, QuestionView } from "@/lib/reviews/types";
import { QaItem } from "./qa-item";

/** Questions & Answers (PRD §8.5.9): search, ask, answer, report. */
export function QASection({ productId, initial, isLoggedIn }: { productId: string; initial: QuestionView[]; isLoggedIn: boolean }) {
  const [questions, setQuestions] = React.useState(initial);
  const [query, setQuery] = React.useState("");
  const [asking, setAsking] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => item.body.toLowerCase().includes(q) || item.answers.some((a) => a.body.toLowerCase().includes(q)));
  }, [questions, query]);

  const ask = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = (await res.json().catch(() => null)) as (QuestionView & { error?: { message?: string } }) | null;
      if (!res.ok || !data) {
        setError(data?.error?.message ?? "Couldn't post your question.");
        return;
      }
      setQuestions((qs) => [data, ...qs]);
      setDraft("");
      setAsking(false);
      toast({ title: "Question posted", description: "We'll notify you when someone answers.", tone: "success" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onAnswer = (questionId: string, answer: AnswerView) =>
    setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, answers: [...q.answers, answer] } : q)));
  const onHide = (questionId: string) => setQuestions((qs) => qs.filter((q) => q.id !== questionId));
  const onHideAnswer = (questionId: string, answerId: string) =>
    setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, answers: q.answers.filter((a) => a.id !== answerId) } : q)));

  return (
    <section id="qa" className="scroll-mt-20 px-4 py-6" aria-labelledby="qa-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="qa-heading" className="font-display text-xl font-bold text-text">
          Questions &amp; Answers <span className="text-base font-normal text-text-tertiary">({questions.length})</span>
        </h2>
        <Button variant="outline" onClick={() => (isLoggedIn ? setAsking((a) => !a) : ask())} aria-expanded={asking}>
          <MessageCircleQuestion className="h-4 w-4" aria-hidden /> Ask a question
        </Button>
      </div>
      {asking && (
        <div className="mt-4 space-y-2 rounded-card border border-border p-4">
          <Textarea
            label="Your question"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder="e.g. Is this suitable for sensitive skin?"
            error={error ?? undefined}
            hint={`${draft.trim().length}/500`}
          />
          <div className="flex gap-2">
            <Button onClick={ask} loading={busy} disabled={draft.trim().length < 10}>
              Post question
            </Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {questions.length > 2 && (
        <Input
          aria-label="Search questions"
          placeholder="Search questions and answers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search className="h-4 w-4" aria-hidden />}
          className="mt-4"
        />
      )}
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          {query ? "No questions match your search." : "No questions yet. Ask the first one!"}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border" aria-live="polite">
          {visible.map((q) => (
            <QaItem key={q.id} question={q} isLoggedIn={isLoggedIn} onAnswer={onAnswer} onHide={onHide} onHideAnswer={onHideAnswer} />
          ))}
        </ul>
      )}
    </section>
  );
}
