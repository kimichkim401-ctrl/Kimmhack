import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIM | Private Digital Identity",
  description: "A cinematic, privacy-conscious digital identity system."
};

export const viewport: Viewport = {
  themeColor: "#050509",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
