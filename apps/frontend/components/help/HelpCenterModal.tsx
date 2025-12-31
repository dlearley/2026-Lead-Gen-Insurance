"use client";

import { Modal } from "@/components/ui/Modal";
import { HelpCenter } from "./HelpCenter";
import { useOnboardingStore } from "@/stores/onboarding.store";

export function HelpCenterModal() {
  const { isHelpCenterOpen, closeHelpCenter, activeHelpArticleId } = useOnboardingStore();

  return (
    <Modal isOpen={isHelpCenterOpen} onClose={closeHelpCenter} title="Help Center" size="xl">
      <HelpCenter initialArticleId={activeHelpArticleId} onRequestClose={closeHelpCenter} />
    </Modal>
  );
}
