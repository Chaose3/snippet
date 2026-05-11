import "./globals.css";

export const metadata = {
  title: "Snippet",
  description: "Jump to moments in songs with Spotify",
};

/** Lets `env(safe-area-inset-*)` resolve correctly on notched iOS devices (Capacitor + Safari). */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
