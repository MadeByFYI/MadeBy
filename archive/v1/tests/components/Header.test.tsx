import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/Header";
import { useSession, signOut } from "next-auth/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

const mockUseSession = useSession as ReturnType<typeof vi.fn>;
const mockSignOut = signOut as ReturnType<typeof vi.fn>;

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when unauthenticated", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("should render the logo and brand name", () => {
      render(<Header />);

      expect(screen.getByText("MadeBy.fyi")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("should render navigation links", () => {
      render(<Header />);

      expect(screen.getByRole("link", { name: /quick start/i })).toHaveAttribute(
        "href",
        "/quick-start"
      );
      expect(screen.getByRole("link", { name: /docs/i })).toHaveAttribute(
        "href",
        "/docs"
      );
    });

    it("should show Sign In button", () => {
      render(<Header />);

      const signInLink = screen.getByRole("link", { name: /sign in/i });
      expect(signInLink).toHaveAttribute("href", "/auth/signin");
    });

    it("should not show Dashboard link", () => {
      render(<Header />);

      expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    });

    it("should not show Sign Out button", () => {
      render(<Header />);

      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    });
  });

  describe("when loading", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
      });
    });

    it("should show loading placeholder", () => {
      render(<Header />);

      // Should show loading skeleton (animate-pulse div)
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should not show Sign In button while loading", () => {
      render(<Header />);

      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  describe("when authenticated", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user_123",
            email: "test@example.com",
            name: "Test User",
          },
        },
        status: "authenticated",
      });
    });

    it("should show Dashboard link", () => {
      render(<Header />);

      expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
        "href",
        "/dashboard"
      );
    });

    it("should show user email as link to identity settings", () => {
      render(<Header />);

      const emailLink = screen.getByRole("link", { name: "test@example.com" });
      expect(emailLink).toHaveAttribute("href", "/settings/identity");
    });

    it("should show Sign Out button", () => {
      render(<Header />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should not show Sign In button", () => {
      render(<Header />);

      expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    });

    it("should call signOut when Sign Out button is clicked", () => {
      render(<Header />);

      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("should have home link on logo", () => {
      render(<Header />);

      const homeLink = screen.getByRole("link", { name: /MadeBy.fyi/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });
});
