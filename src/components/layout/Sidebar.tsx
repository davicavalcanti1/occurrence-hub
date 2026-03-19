import { Link, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
    Home,
    FileText,
    Settings,
    User,
    LogOut,
    ChevronRight,
    BookOpen,
    MoreVertical,
    ClipboardList,
    Globe,
    ShieldAlert,
    Columns3,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const ALL_NAV_LINKS = [
    { id: "home",       href: "/",                  label: "Início",        icon: Home },
    { id: "ocorrencias",href: "/ocorrencias",        label: "Ocorrências",   icon: FileText },
    { id: "kanbans",    href: "/kanbans",            label: "Kanban",        icon: Columns3 },
    { id: "livro",      href: "/livro",              label: "Livro",         icon: BookOpen },
    { id: "analise",    href: "/ocorrencias/historico", label: "Histórico",  icon: ClipboardList },
    { id: "developer",  href: "/developer",          label: "Painel Dev",    icon: Globe },
];

export function Sidebar() {
    const location = useLocation();
    const { profile, tenant, isAdmin, role, signOut } = useAuth();
    const isDeveloper = role === 'developer';
    const { canAccess } = usePermissions();

    const userInitials = profile?.full_name
        ?.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

    const navLinks = ALL_NAV_LINKS.filter(link => canAccess(link.id));

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-slate-200 bg-white shadow-sm transition-all duration-300 z-50">
            {/* Brand */}
            <div className="h-20 flex items-center px-6 border-b border-slate-100">
                <Link to="/" className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="h-5 w-5 text-white" />
                    </div>
                    <div className="leading-tight">
                        <p className="text-sm font-bold text-foreground">Central de</p>
                        <p className="text-sm font-bold text-primary">Ocorrências Digital</p>
                    </div>
                </Link>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground/60 mb-3 px-2 uppercase tracking-wider">
                    Menu Principal
                </p>

                {navLinks.map((link) => {
                    const isActive = location.pathname === link.href ||
                        (link.href !== "/" && location.pathname.startsWith(link.href));

                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full" />
                            )}
                            <link.icon className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                            )} />
                            <span>{link.label}</span>
                            {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-40" />}
                        </Link>
                    );
                })}
            </div>

            {/* User footer */}
            <div className="p-4 border-t border-slate-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors group outline-none">
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start flex-1 overflow-hidden">
                                <span className="text-sm font-medium truncate w-full text-left text-foreground">
                                    {profile?.full_name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate w-full text-left">
                                    {tenant?.name || role}
                                </span>
                            </div>
                            <MoreVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 mb-2" side="right">
                        <div className="px-2 py-1.5 text-sm font-semibold text-foreground">Minha Conta</div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/perfil" className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        {(isAdmin || isDeveloper) && (
                            <DropdownMenuItem asChild>
                                <Link to="/configuracoes" className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Configurações</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-destructive focus:text-destructive cursor-pointer"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
