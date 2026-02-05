import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meghalaya Expense Tracker",
  description: "PWA for managing trip expenses",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OfflineProvider>
            <ServiceWorkerRegister />
            {children}
            <Toaster position="bottom-center" />
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
