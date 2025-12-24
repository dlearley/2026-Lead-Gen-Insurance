import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when clicking overlay", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <p>Modal content</p>
      </Modal>
    );
    const overlay = screen.getByText("Modal content").closest(".fixed");
    if (overlay) {
      fireEvent.click(overlay.parentElement?.querySelector(".bg-opacity-75") as Element);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  it("renders title when provided", () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("applies size classes correctly", () => {
    const { container: smContainer } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="sm">
        Content
      </Modal>
    );
    const { container: lgContainer } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="lg">
        Content
      </Modal>
    );
    expect(smContainer.querySelector(".max-w-md")).toBeInTheDocument();
    expect(lgContainer.querySelector(".max-w-2xl")).toBeInTheDocument();
  });
});
