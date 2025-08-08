import "../styles/globals.css";
import type { Metadata } from "next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: "FoundrCheck",
  description: "Validate your startup ideas with AI and data.",
  keywords: "startup, ideas, validation, AI, analysis",
  authors: [{ name: "FoundrCheck" }],
  openGraph: {
    title: "FoundrCheck",
    description: "Validate your startup ideas with AI and data.",
    type: "website"
  }
};

export const runtime = "edge";

// Web Vitals reporting - handled by @vercel/analytics automatically

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        )}
      </body>
    </html>
  );
}


