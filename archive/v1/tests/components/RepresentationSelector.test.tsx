import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { RepresentationSelector } from "@/components/RepresentationSelector";

const mockRepresentations = [
  {
    id: "rep_standard_123",
    code: "STANDARD",
    assertionLevel: "STANDARD",
    name: "Standard Assertion",
    shortDescription: "Best knowledge assertion",
    assertionText: "I have applied the correct badge to the best of my knowledge.",
    fullLegalText: "LEGAL REPRESENTATION - STANDARD ASSERTION...",
  },
  {
    id: "rep_perjury_456",
    code: "PERJURY",
    assertionLevel: "PERJURY",
    name: "Gold Standard Assertion",
    shortDescription: "Under penalty of perjury + signature",
    assertionText: "I have applied the correct badge...",
    fullLegalText: "LEGAL REPRESENTATION - PERJURY DECLARATION...",
  },
];

describe("RepresentationSelector", () => {
  const defaultProps = {
    selectedRepresentationId: null,
    onRepresentationSelect: vi.fn(),
    signatureName: "",
    onSignatureNameChange: vi.fn(),
    signatureDate: "January 20, 2026",
    creatorName: "Test Creator",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up MSW handler for representations
    server.use(
      http.get("/api/representations", () => {
        return HttpResponse.json({ representations: mockRepresentations });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("should show loading state initially", () => {
    render(<RepresentationSelector {...defaultProps} />);

    // Should show loading skeleton
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should render representation options after loading", async () => {
    render(<RepresentationSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Legal Representation")).toBeInTheDocument();
    });

    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("Standard Assertion")).toBeInTheDocument();
    expect(screen.getByText("Gold Standard Assertion")).toBeInTheDocument();
  });

  it("should show error when fetch fails", async () => {
    server.use(
      http.get("/api/representations", () => {
        return HttpResponse.error();
      })
    );

    render(<RepresentationSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load legal representations")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should call onRepresentationSelect when None is clicked", async () => {
    render(<RepresentationSelector {...defaultProps} selectedRepresentationId="rep_standard_123" />);

    await waitFor(() => {
      expect(screen.getByText("None")).toBeInTheDocument();
    });

    // Find the None radio and click it
    const noneOption = screen.getByText("None").closest("label");
    if (noneOption) {
      fireEvent.click(noneOption);
    }

    expect(defaultProps.onRepresentationSelect).toHaveBeenCalledWith(null);
  });

  it("should call onRepresentationSelect when Standard is clicked", async () => {
    render(<RepresentationSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Standard Assertion")).toBeInTheDocument();
    });

    const standardOption = screen.getByText("Standard Assertion").closest("label");
    if (standardOption) {
      fireEvent.click(standardOption);
    }

    expect(defaultProps.onRepresentationSelect).toHaveBeenCalledWith("rep_standard_123");
  });

  it("should call onRepresentationSelect when Perjury is clicked", async () => {
    render(<RepresentationSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Gold Standard Assertion")).toBeInTheDocument();
    });

    const perjuryOption = screen.getByText("Gold Standard Assertion").closest("label");
    if (perjuryOption) {
      fireEvent.click(perjuryOption);
    }

    expect(defaultProps.onRepresentationSelect).toHaveBeenCalledWith("rep_perjury_456");
  });

  it("should show signature fields when Perjury is selected", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_perjury_456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Digital Signature Required")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Full Legal Name/)).toBeInTheDocument();
    expect(screen.getByText("Date of Signature")).toBeInTheDocument();
    expect(screen.getByText("January 20, 2026")).toBeInTheDocument();
  });

  it("should not show signature fields when Standard is selected", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_standard_123"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Standard Assertion")).toBeInTheDocument();
    });

    expect(screen.queryByText("Digital Signature Required")).not.toBeInTheDocument();
  });

  it("should call onSignatureNameChange when signature input changes", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_perjury_456"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Legal Name/)).toBeInTheDocument();
    });

    const signatureInput = screen.getByLabelText(/Full Legal Name/);
    fireEvent.change(signatureInput, { target: { value: "John Doe" } });

    expect(defaultProps.onSignatureNameChange).toHaveBeenCalledWith("John Doe");
  });

  it("should toggle full legal text visibility", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_standard_123"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Standard Assertion")).toBeInTheDocument();
    });

    // Find and click the "View full legal text" button
    const viewButton = screen.getAllByText(/View full legal text/)[0];
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText("Full Legal Text")).toBeInTheDocument();
      expect(screen.getByText("LEGAL REPRESENTATION - STANDARD ASSERTION...")).toBeInTheDocument();
    });

    // Click again to hide
    const hideButton = screen.getByText(/Hide full legal text/);
    fireEvent.click(hideButton);

    await waitFor(() => {
      expect(screen.queryByText("LEGAL REPRESENTATION - STANDARD ASSERTION...")).not.toBeInTheDocument();
    });
  });

  it("should show disclaimer text", async () => {
    render(<RepresentationSelector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/MadeBy.fyi does NOT assert/)).toBeInTheDocument();
    });
  });

  it("should show perjury warning when perjury is selected", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_perjury_456"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/A false declaration under penalty of perjury/)).toBeInTheDocument();
    });
  });

  it("should use creatorName as placeholder for signature field", async () => {
    render(
      <RepresentationSelector
        {...defaultProps}
        selectedRepresentationId="rep_perjury_456"
        creatorName="Jane Creator"
      />
    );

    await waitFor(() => {
      const input = screen.getByLabelText(/Full Legal Name/);
      expect(input).toHaveAttribute("placeholder", "Jane Creator");
    });
  });
});
