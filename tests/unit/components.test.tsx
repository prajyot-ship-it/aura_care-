import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessibleModal } from "@/components/shared/AccessibleModal";

describe("AccessibleModal: WCAG Portal, Role, and Escape Key", () => {
  it("mounts dialog directly onto document.body and dismisses on Escape key", () => {
    const onClose = vi.fn();

    render(
      <div data-testid="sticky-header-mock">
        <AccessibleModal
          isOpen={true}
          onClose={onClose}
          ariaLabel="Emergency Medical ID Modal"
        >
          <div>
            <h2>Emergency Medical ID</h2>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </AccessibleModal>
      </div>
    );

    const dialog = screen.getByRole("dialog", { name: "Emergency Medical ID Modal" });
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // Must be portaled directly to document.body, NOT inside sticky-header-mock
    expect(dialog.parentElement).toBe(document.body);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Tab and Shift+Tab focus trap cycling
    fireEvent.keyDown(document, { key: "Tab" });
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    // Backdrop click closes modal
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when isOpen is false", () => {
    const onClose = vi.fn();
    render(
      <AccessibleModal isOpen={false} onClose={onClose} ariaLabel="Hidden Modal">
        <div>Hidden Content</div>
      </AccessibleModal>
    );
    expect(screen.queryByRole("dialog", { name: "Hidden Modal" })).toBeNull();
  });
});
