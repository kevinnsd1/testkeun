import type { Metadata } from "next";
import "./globals.css";
import MainLayout from "@/components/MainLayout";
import { DashboardProvider } from '@/context/DashboardContext';

export const metadata: Metadata = {
  title: "FLK Performance Dashboard | PT SIM",
  description: "Real-time recruitment performance monitoring",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DashboardProvider>
          <MainLayout>{children}</MainLayout>
        </DashboardProvider>
      </body>
    </html>
  );
}
