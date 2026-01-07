"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";
import { getChecklistForRole } from "@/lib/onboarding/checklists";
import type { ChecklistItem, OnboardingRole } from "@/lib/onboarding/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";
import { ExternalLink, Sparkles } from "lucide-react";

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export function OnboardingChecklist() {
  const user = useAuthStore((s) => s.user);
  const role = useMemo<OnboardingRole>(() => normalizeOnboardingRole(user?.role), [user?.role]);

  const { checklistProgressByRole, toggleChecklistItem, pendingMilestone, clearPendingMilestone } =
    useOnboardingStore();

  const items = useMemo<ChecklistItem[]>(() => getChecklistForRole(role), [role]);
  const progress = checklistProgressByRole[role];

  const completed = progress.completedItemIds;
  const completedCount = completed.length;
  const total = items.length;

  const [showQuickWinsOnly, setShowQuickWinsOnly] = useState(false);

  const visibleItems = showQuickWinsOnly ? items.filter((i) => i.quickWin) : items;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Checklist</CardTitle>
          <CardDescription>
            Role: <span className="font-medium capitalize">{role}</span> • {completedCount} / {total} complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                <div className="h-full bg-success-500" style={{ width: `${percent(completedCount, total)}%` }} />
              </div>
              <p className="mt-2 text-sm text-secondary-600">{percent(completedCount, total)}% complete</p>
            </div>
            <Button
              variant={showQuickWinsOnly ? "default" : "outline"}
              onClick={() => setShowQuickWinsOnly((v) => !v)}
            >
              {showQuickWinsOnly ? "Showing Quick Wins" : "Show Quick Wins"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
          <CardDescription>Estimated time is shown per step.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const isChecked = completed.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-4 rounded-xl border p-4",
                    isChecked ? "border-success-200 bg-success-50" : "border-secondary-200 bg-white"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isChecked}
                      onChange={() => toggleChecklistItem(role, item.id)}
                      aria-label={`Mark ${item.title} complete`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-secondary-900">{item.title}</p>
                        {item.quickWin && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-700 bg-warning-100 px-2 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3" />
                            Quick win
                          </span>
                        )}
                        <span className="text-xs text-secondary-500">~{item.estimatedMinutes} min</span>
                      </div>
                      <p className="mt-1 text-sm text-secondary-600">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.href && (
                      <Link href={item.href}>
                        <Button variant="outline" size="sm">
                          Go
                        </Button>
                      </Link>
                    )}
                    {item.resourceHref && (
                      <a href={item.resourceHref} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!pendingMilestone && pendingMilestone.role === role}
        onClose={clearPendingMilestone}
        title="Milestone unlocked"
      >
        <div className="space-y-3">
          <p className="text-secondary-700">
            Nice work — you’ve completed <span className="font-semibold">{pendingMilestone?.count}</span> onboarding steps.
          </p>
          <p className="text-sm text-secondary-600">
            Keep going to finish the full checklist and unlock your team’s ‘first week’ workflow.
          </p>
          <div className="flex justify-end">
            <Button onClick={clearPendingMilestone}>Continue</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
