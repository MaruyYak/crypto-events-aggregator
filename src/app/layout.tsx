import "./globals.css";
import type { Metadata } from "next";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Crypto Events Hub",
  description: "Календарь крипто-ивентов: глобальные, локальные и узконаправленные",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
