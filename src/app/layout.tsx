import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const metadata: Metadata = {
  title: "Socraty — The learning execution engine",
  description:
    "Turn your scattered learning materials into structured daily actions. Upload anything, get action items, and track real comprehension with Socratic questioning.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Socraty — The learning execution engine",
    description:
      "Turn your scattered learning materials into structured daily actions. Upload anything, get action items, and track real comprehension.",
    url: "https://socraty.ai",
    siteName: "Socraty",
    type: "website",
    images: [
      {
        url: "https://socraty.ai/logo.png",
        width: 688,
        height: 128,
        alt: "Socraty",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Socraty — The learning execution engine",
    description:
      "Turn your scattered learning materials into structured daily actions.",
    images: ["https://socraty.ai/logo.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${figtree.variable} ${inter.variable} antialiased`}
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
