import type { ReactNode } from "react";

export const metadata = {
  title: "MadeBy — who made this thing?",
  description: "A verifiable content-provenance layer, starting with code.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          background: "#0b0f17",
          color: "#e6edf3",
        }}
      >
        {children}
      </body>
    </html>
  );
}
