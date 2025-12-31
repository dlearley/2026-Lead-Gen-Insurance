"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/utils/cn";
import { faq, helpCenterArticles, searchHelpCenterArticles } from "@/lib/help-center/articles";
import { useOnboardingStore } from "@/stores/onboarding.store";

interface HelpCenterProps {
  initialArticleId?: string | null;
  onRequestClose?: () => void;
}

export function HelpCenter({ initialArticleId, onRequestClose }: HelpCenterProps) {
  const [query, setQuery] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(initialArticleId || null);

  const { submitArticleFeedback } = useOnboardingStore();
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    setActiveArticleId(initialArticleId || null);
  }, [initialArticleId]);

  const results = useMemo(() => {
    if (!query.trim()) return helpCenterArticles;
    return searchHelpCenterArticles(query);
  }, [query]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return helpCenterArticles.find((a) => a.id === activeArticleId) || null;
  }, [activeArticleId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of helpCenterArticles) set.add(a.category);
    return Array.from(set).sort();
  }, []);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = results;
    if (!activeCategory) return base;
    return base.filter((a) => a.category === activeCategory);
  }, [results, activeCategory]);

  const resetFeedbackUI = () => {
    setWasHelpful(null);
    setFeedbackComment("");
  };

  const submitFeedback = () => {
    if (!activeArticle || wasHelpful === null) return;

    submitArticleFeedback({
      articleId: activeArticle.id,
      wasHelpful,
      comment: feedbackComment.trim() || undefined,
    });

    resetFeedbackUI();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Help Center</CardTitle>
              <CardDescription>Search articles, FAQs, and troubleshooting steps.</CardDescription>
            </div>
            {onRequestClose && (
              <Button variant="outline" size="sm" onClick={onRequestClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search (e.g., import, password, reports)…"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border",
                    !activeCategory
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-secondary-700 border-secondary-200 hover:bg-secondary-50"
                  )}
                  onClick={() => setActiveCategory(null)}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border",
                      activeCategory === c
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-secondary-700 border-secondary-200 hover:bg-secondary-50"
                    )}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-secondary-200 overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  {filtered.slice(0, 100).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setActiveArticleId(a.id);
                        resetFeedbackUI();
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-secondary-200 hover:bg-secondary-50",
                        activeArticleId === a.id && "bg-primary-50"
                      )}
                    >
                      <p className="text-sm font-semibold text-secondary-900">{a.title}</p>
                      <p className="text-xs text-secondary-600 mt-1">{a.summary}</p>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="p-4 text-sm text-secondary-600">No results found.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {activeArticle ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{activeArticle.title}</CardTitle>
                    <CardDescription>
                      Category: {activeArticle.category} • Tags: {activeArticle.tags.map((t) => `#${t}`).join(" ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm text-secondary-800 leading-6">
                      {activeArticle.body}
                    </pre>

                    <div className="mt-6 rounded-xl border border-secondary-200 p-4 space-y-3">
                      <p className="text-sm font-semibold text-secondary-900">Was this article helpful?</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={wasHelpful === true ? "default" : "outline"}
                          size="sm"
                          onClick={() => setWasHelpful(true)}
                        >
                          Yes
                        </Button>
                        <Button
                          variant={wasHelpful === false ? "default" : "outline"}
                          size="sm"
                          onClick={() => setWasHelpful(false)}
                        >
                          No
                        </Button>
                      </div>

                      {wasHelpful !== null && (
                        <div className="space-y-2">
                          <Textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="Optional: what should we add or clarify?"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={submitFeedback}>
                              Send feedback
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>FAQ</CardTitle>
                    <CardDescription>Common questions and answers.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {faq.map((item) => (
                        <div key={item.question} className="rounded-xl border border-secondary-200 p-4">
                          <p className="font-semibold text-secondary-900">{item.question}</p>
                          <p className="mt-2 text-sm text-secondary-700">{item.answer}</p>
                        </div>
                      ))}
                      <p className="text-xs text-secondary-500">
                        Tip: Use search above to find role-specific setup and troubleshooting.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
