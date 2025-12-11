// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Event Drink Selector',
  description: 'Simple drink selector for event guests',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  )
}
