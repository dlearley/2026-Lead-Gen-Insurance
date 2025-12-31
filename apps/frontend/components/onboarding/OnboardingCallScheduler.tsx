"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { normalizeOnboardingRole } from "@/lib/onboarding/tours";
import type { OnboardingCallBooking, OnboardingRole } from "@/lib/onboarding/types";
import {
  generateNextBusinessDaySlots,
  getOnboardingCallAgenda,
  getPostCallFollowUpChecklist,
  getPreCallPrepMaterials,
} from "@/lib/onboarding/calls";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Calendar, ClipboardCopy, Link as LinkIcon, Video } from "lucide-react";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildCrmNotes(role: OnboardingRole, booking: OnboardingCallBooking, agendaNotes?: string) {
  return [
    "Onboarding Call Notes",
    `Role: ${role}`,
    `Scheduled: ${formatDateTime(booking.scheduledForIso)}`,
    "",
    "Agenda covered:",
    "- Goals and success criteria",
    "- Platform walkthrough",
    "- Checklist review",
    "- Q&A / next steps",
    "",
    agendaNotes ? `Additional notes:\n${agendaNotes}` : "Additional notes: (none)",
    "",
    "Action items:",
    "- Complete onboarding checklist milestones",
    "- Validate notifications + routing",
    "- Import/upload real leads",
  ].join("\n");
}

export function OnboardingCallScheduler() {
  const user = useAuthStore((s) => s.user);
  const role = useMemo<OnboardingRole>(() => normalizeOnboardingRole(user?.role), [user?.role]);

  const { callBookings, bookOnboardingCall, setOnboardingCallStatus, updateOnboardingCall } =
    useOnboardingStore();

  const slots = useMemo(() => generateNextBusinessDaySlots(21), []);

  const scheduled = callBookings
    .filter((b) => b.status === "scheduled")
    .sort((a, b) => a.scheduledForIso.localeCompare(b.scheduledForIso));

  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<OnboardingCallBooking | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [agendaNotes, setAgendaNotes] = useState("");

  const agenda = useMemo(() => getOnboardingCallAgenda(), []);
  const prep = useMemo(() => getPreCallPrepMaterials(role), [role]);
  const followUp = useMemo(() => getPostCallFollowUpChecklist(), []);

  const openConfirm = (iso: string) => {
    setSelectedSlotIso(iso);
    setIsConfirmOpen(true);
  };

  const confirmBooking = () => {
    if (!selectedSlotIso) return;
    bookOnboardingCall(selectedSlotIso);
    setIsConfirmOpen(false);
    setSelectedSlotIso(null);
  };

  const openBooking = (booking: OnboardingCallBooking) => {
    setSelectedBooking(booking);
    setRecordingUrl(booking.recordingUrl || "");
    setAgendaNotes(booking.agendaNotes || "");
  };

  const saveBooking = () => {
    if (!selectedBooking) return;
    const crmNotes = buildCrmNotes(role, selectedBooking, agendaNotes);

    updateOnboardingCall(selectedBooking.id, {
      recordingUrl: recordingUrl.trim() || undefined,
      agendaNotes: agendaNotes.trim() || undefined,
      crmNotes,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const activeCrmNotes = selectedBooking
    ? buildCrmNotes(role, selectedBooking, agendaNotes)
    : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule a Live Onboarding Call
          </CardTitle>
          <CardDescription>
            Pick a slot, then use the agenda and templates below to run a consistent 1-hour kickoff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.slice(0, 18).map((s) => (
              <button
                key={s.startIso}
                className="rounded-xl border border-secondary-200 bg-white p-4 text-left hover:bg-secondary-50"
                onClick={() => openConfirm(s.startIso)}
                type="button"
              >
                <p className="text-sm font-semibold text-secondary-900">{s.label}</p>
                <p className="mt-1 text-xs text-secondary-500">60 min • Remote</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>Manage recordings and CRM notes after the call.</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduled.length === 0 ? (
            <p className="text-sm text-secondary-600">No calls scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {scheduled.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-secondary-200 p-4">
                  <div>
                    <p className="font-medium text-secondary-900">{formatDateTime(b.scheduledForIso)}</p>
                    <p className="text-xs text-secondary-500">Status: {b.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openBooking(b)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOnboardingCallStatus(b.id, "cancelled")}
                      className="text-error-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Agenda (60 minutes)</CardTitle>
          <CardDescription>Use this template to keep onboarding consistent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agenda.map((section) => (
              <div key={section.title} className="rounded-xl border border-secondary-200 p-4">
                <p className="font-semibold text-secondary-900">{section.title}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-secondary-700 space-y-1">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-call prep</CardTitle>
          <CardDescription>Send this to attendees before the kickoff.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-secondary-700 space-y-1">
            {prep.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Post-call follow-up</CardTitle>
          <CardDescription>Make sure onboarding progresses after the meeting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-secondary-700 space-y-1">
            {followUp.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm booking"
      >
        <div className="space-y-4">
          <p className="text-secondary-700">
            Book onboarding call for <span className="font-semibold">{selectedSlotIso ? formatDateTime(selectedSlotIso) : ""}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Back
            </Button>
            <Button onClick={confirmBooking}>Confirm</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking details"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-xl border border-secondary-200 p-4">
              <p className="font-medium text-secondary-900">{formatDateTime(selectedBooking.scheduledForIso)}</p>
              <p className="text-xs text-secondary-500">Role: {role}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
                  <Video className="h-4 w-4" /> Recording URL
                </p>
                <Input
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> Meeting link
                </p>
                <Input value="(Use your preferred Zoom/Meet link)" readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-secondary-900">Agenda notes</p>
              <Textarea
                value={agendaNotes}
                onChange={(e) => setAgendaNotes(e.target.value)}
                placeholder="Capture decisions, questions, and action items..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-secondary-900">CRM notes</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(activeCrmNotes)}
                >
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-xs text-secondary-800 whitespace-pre-wrap">
                {activeCrmNotes}
              </pre>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  saveBooking();
                  setOnboardingCallStatus(selectedBooking.id, "completed");
                  setSelectedBooking(null);
                }}
              >
                Mark Completed
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    saveBooking();
                  }}
                >
                  Save
                </Button>
                <Button onClick={() => setSelectedBooking(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
