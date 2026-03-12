import { Bell, Search, ChevronDown, Building2, LogOut, User, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";

export function Header() {
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || profile?.email || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel: Record<string, string> = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
  };

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Workspace Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 text-foreground hover:bg-secondary">
            <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm">{currentWorkspace.name}</span>
              <span className="text-[10px] text-muted-foreground">{currentWorkspace.niche}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
          <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => setCurrentWorkspace(workspace)}
              className={cn(
                "cursor-pointer",
                workspace.id === currentWorkspace.id && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{workspace.name}</div>
                  <div className="text-xs text-muted-foreground">{workspace.niche}</div>
                </div>
                {workspace.id === currentWorkspace.id && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads, conversas..."
            className="pl-10 bg-secondary/50 border-border focus:bg-secondary"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {isDemoMode && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
            DEMO MODE
          </Badge>
        )}

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-foreground hover:bg-secondary">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="font-medium text-sm">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {roleLabel[profile?.role ?? ""] ?? "Membro"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2">
              <User className="w-4 h-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2">
              <KeyRound className="w-4 h-4" /> API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
