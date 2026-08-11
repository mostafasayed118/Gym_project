import { auth } from "@clerk/nextjs/server"
import { Metadata } from "next"
import { LandingPageClient } from "@/components/landing-page-client"

export const metadata: Metadata = {
  title: "GymPro - Professional Gym Management Platform for Coaches & Clients",
  description:
    "Track workouts, manage training plans, and connect with your coach in real-time. The all-in-one platform for fitness professionals and their clients.",
  keywords: [
    "gym management",
    "personal trainer",
    "workout tracker",
    "fitness coaching",
    "training plans",
    "workout app",
    "coach client platform",
  ],
  openGraph: {
    type: "website",
    siteName: "GymPro",
    title: "GymPro - Professional Gym Management Platform",
    description:
      "Track workouts, manage training plans, and connect with your coach in real-time.",
    url: "https://gympro.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GymPro - Gym Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GymPro - Professional Gym Management Platform",
    description:
      "Track workouts, manage training plans, and connect with your coach in real-time.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://gympro.app",
  },
}

export default async function HomePage() {
  const session = await auth()

  return <LandingPageClient isAuthenticated={!!session.userId} />
}
