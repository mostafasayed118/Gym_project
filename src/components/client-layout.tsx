"use client"

import * as React from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MobileBottomNav />
    </>
  )
}
