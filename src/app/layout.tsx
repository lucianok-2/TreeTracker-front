import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TreeTracker - Balance de Materiales',
  description: 'Sistema de balance de materiales forestales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
