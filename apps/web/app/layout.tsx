export const metadata = {
  title: "TIASAS",
  description: "TIASAS family studio",
};

import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <SessionProvider>
          <ThemeProvider defaultTheme="system">
          {children}
        </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
