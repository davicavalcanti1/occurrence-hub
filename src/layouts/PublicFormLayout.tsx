import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

interface PublicFormLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
    colorTheme?: "blue" | "green" | "purple" | "orange" | "rose";
}

export function PublicFormLayout({
    children,
    title,
    subtitle,
    colorTheme = "blue"
}: PublicFormLayoutProps) {

    const themeColors = {
        blue: "bg-[#1e3a8a]", // Darker blue
        green: "bg-green-600",
        purple: "bg-purple-600",
        orange: "bg-orange-600",
        rose: "bg-rose-600",
    };

    const headerColor = themeColors[colorTheme];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Background Pattern */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" />

            {/* Header */}
            <header className={`w-full ${headerColor} text-white shadow-lg sticky top-0 z-50`}>
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{title}</h1>
                            {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 relative z-10 pb-20">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full text-center py-6 text-gray-400 text-xs relative z-10">
                <p>© 2026 Central de Ocorrências Digital</p>
            </footer>
        </div>
    );
}
