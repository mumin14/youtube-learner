import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Socraty — The learning execution engine",
  description:
    "Turn your scattered learning materials into structured daily actions. Upload anything, get action items, and track real comprehension with Socratic questioning.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Socraty — The learning execution engine",
    description:
      "Turn your scattered learning materials into structured daily actions. Upload anything, get action items, and track real comprehension.",
    url: "https://socraty.ai",
    siteName: "Socraty",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Socraty — The learning execution engine",
    description:
      "Turn your scattered learning materials into structured daily actions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
