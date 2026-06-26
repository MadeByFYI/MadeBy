import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { ApiKeyManager } from "@/components/dashboard/ApiKeyManager";

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const mockKeys = [
  {
    id: "key_123",
    name: "Production App",
    keyPrefix: "mk_abcdefgh",
    scopes: null,
    lastUsedAt: new Date().toISOString(),
    expiresAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "key_456",
    name: "CI/CD Pipeline",
    keyPrefix: "mk_ijklmnop",
    scopes: null,
    lastUsedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

describe("ApiKeyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.get("/api/keys", () => {
        return HttpResponse.json({ keys: mockKeys });
      }),
      http.post("/api/keys", async ({ request }) => {
        const body = await request.json() as { name: string };
        return HttpResponse.json({
          id: "key_new",
          key: "mk_new_secret_key_12345",
          keyPrefix: "mk_new_secre",
          name: body.name,
          expiresAt: null,
          message: "Key created successfully",
        });
      }),
      http.delete("/api/keys/:id", () => {
        return HttpResponse.json({ success: true });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("should show loading state initially", () => {
    // Make the request hang
    server.use(
      http.get("/api/keys", () => {
        return new Promise(() => {}); // Never resolves
      })
    );

    render(<ApiKeyManager />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should display API keys after loading", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Production App")).toBeInTheDocument();
    });

    expect(screen.getByText("CI/CD Pipeline")).toBeInTheDocument();
    expect(screen.getByText("mk_abcdefgh...")).toBeInTheDocument();
  });

  it("should show empty state when no keys exist", async () => {
    server.use(
      http.get("/api/keys", () => {
        return HttpResponse.json({ keys: [] });
      })
    );

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("No API keys yet")).toBeInTheDocument();
    });

    expect(screen.getByText("Create your first API key to get started")).toBeInTheDocument();
  });

  it("should show error when fetch fails", async () => {
    server.use(
      http.get("/api/keys", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch keys")).toBeInTheDocument();
    });
  });

  it("should show create new key form when button is clicked", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create New API Key"));

    expect(screen.getByPlaceholderText(/Production App/)).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
  });

  it("should cancel creating new key", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Create New API Key"));
    expect(screen.getByPlaceholderText(/Production App/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    // Form should be hidden now
    expect(screen.queryByPlaceholderText(/Production App/)).not.toBeInTheDocument();
  });

  it("should create new API key", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
    });

    // Click to show form
    fireEvent.click(screen.getByText("Create New API Key"));

    // Fill in the form
    const input = screen.getByPlaceholderText(/Production App/);
    fireEvent.change(input, { target: { value: "Test Key" } });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Create API Key/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("API Key Created")).toBeInTheDocument();
    });

    expect(screen.getByText("mk_new_secret_key_12345")).toBeInTheDocument();
  });

  it("should copy newly created key to clipboard", async () => {
    server.use(
      http.get("/api/keys", () => {
        return HttpResponse.json({ keys: [] });
      })
    );

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
    });

    // Create a key
    fireEvent.click(screen.getByText("Create New API Key"));
    const input = screen.getByPlaceholderText(/Production App/);
    fireEvent.change(input, { target: { value: "Test Key" } });
    fireEvent.click(screen.getByRole("button", { name: /Create API Key/i }));

    await waitFor(() => {
      expect(screen.getByText("API Key Created")).toBeInTheDocument();
    });

    // Click copy button
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(mockWriteText).toHaveBeenCalledWith("mk_new_secret_key_12345");
  });

  it("should show delete confirmation when delete button is clicked", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Production App")).toBeInTheDocument();
    });

    // Find and click delete button (trash icon)
    const deleteButtons = screen.getAllByTitle("Delete key");
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("should cancel delete when No is clicked", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Production App")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete key");
    fireEvent.click(deleteButtons[0]);

    fireEvent.click(screen.getByRole("button", { name: "No" }));

    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("should display relative time for last used", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Production App")).toBeInTheDocument();
    });

    // First key was used today
    expect(screen.getByText("Today")).toBeInTheDocument();

    // Second key was never used
    expect(screen.getByText("Never used")).toBeInTheDocument();
  });

  it("should show expiration date for keys with expiry", async () => {
    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("CI/CD Pipeline")).toBeInTheDocument();
    });

    // Should show "Expires" text
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });

  it("should dismiss newly created key alert", async () => {
    server.use(
      http.get("/api/keys", () => {
        return HttpResponse.json({ keys: [] });
      })
    );

    render(<ApiKeyManager />);

    await waitFor(() => {
      expect(screen.getByText("Create New API Key")).toBeInTheDocument();
    });

    // Create a key
    fireEvent.click(screen.getByText("Create New API Key"));
    const input = screen.getByPlaceholderText(/Production App/);
    fireEvent.change(input, { target: { value: "Test Key" } });
    fireEvent.click(screen.getByRole("button", { name: /Create API Key/i }));

    await waitFor(() => {
      expect(screen.getByText("API Key Created")).toBeInTheDocument();
    });

    // Click dismiss
    fireEvent.click(screen.getByText("Dismiss"));

    expect(screen.queryByText("API Key Created")).not.toBeInTheDocument();
  });
});
