import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ClientLayout } from "@/components/client-layout";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { OfflineIndicator } from "@/components/offline-indicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymPro - Gym Management Platform",
  description:
    "Professional gym management platform for coaches and clients. Track workouts, plans, and progress in real-time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymPro",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 1024px)",
      },
      {
        url: "/icons/icon-384x384.png",
        media: "(device-width: 768px)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "GymPro",
    title: "GymPro - Gym Management Platform",
    description:
      "Professional gym management platform for coaches and clients.",
  },
  twitter: {
    card: "summary",
    title: "GymPro",
    description:
      "Professional gym management platform for coaches and clients.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111508" },
    { media: "(prefers-color-scheme: light)", color: "#111508" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
        suppressHydrationWarning
      >
        <head>
          {/* Apple PWA tags */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="GymPro" />
          <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />

          {/* Android/Chrome PWA tags */}
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="GymPro" />

          {/* Microsoft tiles */}
          <meta name="msapplication-TileColor" content="#111508" />
          <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />

          {/* Favicon */}
          <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />

          {/* Preconnect to Convex for faster offline sync */}
          <link rel="preconnect" href="https://*.convex.cloud" />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground pb-16 md:pb-0" suppressHydrationWarning>
          <ServiceWorkerRegistration />
          <Providers>
            <ClientLayout>
              {children}
            </ClientLayout>
            <OfflineIndicator />
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
