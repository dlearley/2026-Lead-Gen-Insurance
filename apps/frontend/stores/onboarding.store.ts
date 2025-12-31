import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  HelpArticleFeedback,
  OnboardingCallBooking,
  OnboardingCallStatus,
  OnboardingRole,
  TourFeedback,
} from "@/lib/onboarding/types";

interface ActiveTourState {
  role: OnboardingRole;
  stepIndex: number;
  startedAtIso: string;
}

interface ChecklistProgress {
  completedItemIds: string[];
  lastUpdatedAtIso: string | null;
  lastCelebratedMilestone: number;
}

interface OnboardingState {
  activeTour: ActiveTourState | null;
  tourCompletedAtByRole: Partial<Record<OnboardingRole, string>>;
  tourSkippedAtByRole: Partial<Record<OnboardingRole, string>>;
  tourFeedback: TourFeedback[];

  checklistProgressByRole: Record<OnboardingRole, ChecklistProgress>;
  pendingMilestone: { role: OnboardingRole; count: number } | null;

  callBookings: OnboardingCallBooking[];

  isHelpCenterOpen: boolean;
  activeHelpArticleId: string | null;
  articleFeedback: HelpArticleFeedback[];

  startTour: (role: OnboardingRole) => void;
  stopTour: () => void;
  setTourStepIndex: (stepIndex: number) => void;
  nextTourStep: (maxSteps: number) => void;
  prevTourStep: () => void;
  completeTour: (role: OnboardingRole, feedback: Omit<TourFeedback, "createdAtIso" | "role">) => void;
  skipTour: (role: OnboardingRole) => void;
  resetTour: (role: OnboardingRole) => void;

  toggleChecklistItem: (role: OnboardingRole, itemId: string) => void;
  clearPendingMilestone: () => void;

  bookOnboardingCall: (scheduledForIso: string) => void;
  updateOnboardingCall: (id: string, patch: Partial<OnboardingCallBooking>) => void;
  setOnboardingCallStatus: (id: string, status: OnboardingCallStatus) => void;

  openHelpCenter: (articleId?: string) => void;
  closeHelpCenter: () => void;
  submitArticleFeedback: (feedback: Omit<HelpArticleFeedback, "createdAtIso">) => void;
}

const defaultProgress = (): ChecklistProgress => ({
  completedItemIds: [],
  lastUpdatedAtIso: null,
  lastCelebratedMilestone: 0,
});

const newId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      activeTour: null,
      tourCompletedAtByRole: {},
      tourSkippedAtByRole: {},
      tourFeedback: [],

      checklistProgressByRole: {
        admin: defaultProgress(),
        manager: defaultProgress(),
        agent: defaultProgress(),
      },
      pendingMilestone: null,

      callBookings: [],

      isHelpCenterOpen: false,
      activeHelpArticleId: null,
      articleFeedback: [],

      startTour: (role) => {
        set({
          activeTour: {
            role,
            stepIndex: 0,
            startedAtIso: new Date().toISOString(),
          },
        });
      },
      stopTour: () => set({ activeTour: null }),
      setTourStepIndex: (stepIndex) =>
        set((state) =>
          state.activeTour
            ? { activeTour: { ...state.activeTour, stepIndex } }
            : state
        ),
      nextTourStep: (maxSteps) =>
        set((state) => {
          if (!state.activeTour) return state;
          return {
            activeTour: {
              ...state.activeTour,
              stepIndex: Math.min(state.activeTour.stepIndex + 1, maxSteps - 1),
            },
          };
        }),
      prevTourStep: () =>
        set((state) => {
          if (!state.activeTour) return state;
          return {
            activeTour: {
              ...state.activeTour,
              stepIndex: Math.max(state.activeTour.stepIndex - 1, 0),
            },
          };
        }),
      completeTour: (role, feedback) => {
        const entry: TourFeedback = {
          role,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAtIso: new Date().toISOString(),
        };

        set((state) => ({
          activeTour: null,
          tourCompletedAtByRole: {
            ...state.tourCompletedAtByRole,
            [role]: new Date().toISOString(),
          },
          tourSkippedAtByRole: {
            ...state.tourSkippedAtByRole,
            [role]: undefined,
          },
          tourFeedback: [entry, ...state.tourFeedback].slice(0, 50),
        }));
      },
      skipTour: (role) =>
        set((state) => ({
          activeTour: null,
          tourSkippedAtByRole: {
            ...state.tourSkippedAtByRole,
            [role]: new Date().toISOString(),
          },
        })),
      resetTour: (role) =>
        set((state) => ({
          tourCompletedAtByRole: { ...state.tourCompletedAtByRole, [role]: undefined },
          tourSkippedAtByRole: { ...state.tourSkippedAtByRole, [role]: undefined },
        })),

      toggleChecklistItem: (role, itemId) =>
        set((state) => {
          const progress = state.checklistProgressByRole[role];
          const alreadyDone = progress.completedItemIds.includes(itemId);
          const completedItemIds = alreadyDone
            ? progress.completedItemIds.filter((id) => id !== itemId)
            : [...progress.completedItemIds, itemId];

          const nextProgress: ChecklistProgress = {
            ...progress,
            completedItemIds,
            lastUpdatedAtIso: new Date().toISOString(),
          };

          const completedCount = completedItemIds.length;
          const milestones = [5, 10, 20];
          const hitMilestone = milestones.find(
            (m) => completedCount === m && m > progress.lastCelebratedMilestone
          );

          return {
            checklistProgressByRole: {
              ...state.checklistProgressByRole,
              [role]: hitMilestone
                ? { ...nextProgress, lastCelebratedMilestone: hitMilestone }
                : nextProgress,
            },
            pendingMilestone: hitMilestone ? { role, count: hitMilestone } : state.pendingMilestone,
          };
        }),
      clearPendingMilestone: () => set({ pendingMilestone: null }),

      bookOnboardingCall: (scheduledForIso) =>
        set((state) => {
          const existing = state.callBookings.find(
            (b) => b.status === "scheduled" && b.scheduledForIso === scheduledForIso
          );
          if (existing) return state;

          const nowIso = new Date().toISOString();
          const booking: OnboardingCallBooking = {
            id: newId(),
            scheduledForIso,
            status: "scheduled",
            createdAtIso: nowIso,
            updatedAtIso: nowIso,
          };
          return { callBookings: [booking, ...state.callBookings] };
        }),
      updateOnboardingCall: (id, patch) =>
        set((state) => ({
          callBookings: state.callBookings.map((b) =>
            b.id === id ? { ...b, ...patch, updatedAtIso: new Date().toISOString() } : b
          ),
        })),
      setOnboardingCallStatus: (id, status) =>
        set((state) => ({
          callBookings: state.callBookings.map((b) =>
            b.id === id ? { ...b, status, updatedAtIso: new Date().toISOString() } : b
          ),
        })),

      openHelpCenter: (articleId) => set({ isHelpCenterOpen: true, activeHelpArticleId: articleId || null }),
      closeHelpCenter: () => set({ isHelpCenterOpen: false, activeHelpArticleId: null }),
      submitArticleFeedback: (feedback) =>
        set((state) => ({
          articleFeedback: [
            {
              ...feedback,
              createdAtIso: new Date().toISOString(),
            },
            ...state.articleFeedback,
          ].slice(0, 200),
        })),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tourCompletedAtByRole: state.tourCompletedAtByRole,
        tourSkippedAtByRole: state.tourSkippedAtByRole,
        tourFeedback: state.tourFeedback,
        checklistProgressByRole: state.checklistProgressByRole,
        callBookings: state.callBookings,
        articleFeedback: state.articleFeedback,
      }),
    }
  )
);
