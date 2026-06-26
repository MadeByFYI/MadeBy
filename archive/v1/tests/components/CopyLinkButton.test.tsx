import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CopyLinkButton } from "@/components/CopyLinkButton";

describe("CopyLinkButton", () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render with copy icon initially", () => {
    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "Copy declaration link");
  });

  it("should copy URL to clipboard when clicked", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith("https://example.com/test");
  });

  it("should show success state after copying", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(button).toHaveAttribute("title", "Copied!");
    });
  });

  it("should revert to normal state after 2 seconds", async () => {
    vi.useFakeTimers();
    mockWriteText.mockResolvedValue(undefined);

    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
      // Allow promise to resolve
      await Promise.resolve();
    });

    expect(button).toHaveAttribute("title", "Copied!");

    // Advance timer by 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(button).toHaveAttribute("title", "Copy declaration link");
  });

  it("should handle clipboard errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockWriteText.mockRejectedValue(new Error("Clipboard error"));

    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("should apply custom className", () => {
    render(<CopyLinkButton url="https://example.com/test" className="custom-class" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should apply success styling when copied", async () => {
    mockWriteText.mockResolvedValue(undefined);

    render(<CopyLinkButton url="https://example.com/test" />);

    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(button).toHaveClass("text-emerald-600");
      expect(button).toHaveClass("bg-emerald-50");
    });
  });
});
