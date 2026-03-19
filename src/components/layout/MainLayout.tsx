import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import imagoLoginCover from "@/assets/imago-login-cover.png";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden font-sans antialiased">
      {/* Global Background */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none">
        <img
          src={imagoLoginCover}
          alt="Background"
          className="w-full h-full object-cover opacity-[0.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background/80 to-background/95" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Top Nav */}
        <div className="lg:hidden">
          <TopNav />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-hidden">
          <main className="flex-1 overflow-y-auto container px-4 py-6 md:px-8 md:py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}

            <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border/40 bg-background/30 backdrop-blur-sm mt-auto">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
                <span className="text-balance text-center leading-loose">
                  Sistema de Gestão - Imago Diagnóstico por Imagem v3.1.1
                </span>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
