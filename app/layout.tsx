import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/toaster"
import { AuthProvider } from "@/contexts/AuthContext"

export const metadata: Metadata = {
  title: {
    default: "QA Tool",
    template: "%s | QA Tool",
  },
  description: "Professional QA test case and bug report management platform",
  keywords: ["QA", "testing", "bug reports", "test cases", "quality assurance"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
