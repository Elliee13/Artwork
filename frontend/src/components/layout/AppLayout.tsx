import type { ReactNode } from "react";
import AppTitle from "@/components/layout/AppTitle";

type AppLayoutProps = {
  children: ReactNode;
  subtitle?: string;
};

export default function AppLayout({ children, subtitle }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <main className="mx-auto w-full max-w-[1560px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        <header className="mx-auto mb-10 max-w-[900px] space-y-2 text-center sm:mb-12">
          <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">Internal Gallery</p>
          <AppTitle />
          {subtitle ? (
            <p className="text-pretty mx-auto mt-1 max-w-[65ch] font-sans text-sm leading-relaxed text-muted-foreground/80 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
