import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'LMS Platform',
  description: 'Learning Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-gray-50">{children}</body>
      </html>
    </ClerkProvider>
  )
}