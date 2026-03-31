import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piros Tape Studio",
  description: "Production dashboard for Piros Tape — vintage re-edits of Hungarian rap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className="h-full">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-noir-3 py-6 text-center">
          <p className="font-body italic text-sm text-dust">
            &ldquo;Nincs címke, nincs arc — csak a hang.&rdquo;
          </p>
          <p className="font-mono text-[10px] text-dust mt-1 uppercase tracking-wider">
            Piros Tape
          </p>
        </footer>
      </body>
    </html>
  );
}
