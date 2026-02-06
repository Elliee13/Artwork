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
        <header className="mb-8 text-center sm:mb-10">
          <AppTitle />
          {subtitle ? (
            <p className="mt-1 text-xs font-normal leading-relaxed text-muted-foreground/80 sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
