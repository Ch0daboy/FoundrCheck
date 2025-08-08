import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FoundrCheck",
  description: "Validate your startup ideas with AI and data.",
};

export const runtime = "edge";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}


