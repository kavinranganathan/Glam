import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "GLAM — Beauty & Lifestyle Marketplace",
    template: "%s | GLAM",
  },
  description:
    "Discover products that work for your skin and style. Verified brands, real reviews, fast delivery across India.",
  applicationName: "GLAM",
};

export const viewport: Viewport = {
  themeColor: "#db2777",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-text">{children}</body>
    </html>
  );
}
