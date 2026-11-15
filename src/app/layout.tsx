import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { LivingFlowEngine } from "@/components/shared/LivingFlowEngine";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURA•CARE | Sovereign Elderly Care & Medication Co-Pilot",
  description:
    "Healthcare coordination that keeps dignity in the driver's seat. Dual-Mode Passcode Ergonomics, Atomic Double-Dose Mutex Lock, Polypharmacy Guardrails, and Proactive 3-Tier Email Escalation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#FFFFFF] text-[#111827] font-sans antialiased selection:bg-[#0F766E] selection:text-white">
        <ThemeProvider>
          <LivingFlowEngine />
          <div className="relative z-10">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
