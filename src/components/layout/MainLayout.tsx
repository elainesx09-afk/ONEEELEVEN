import { Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

export function MainLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <TooltipProvider delayDuration={0}>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 p-6 overflow-auto">
                <Outlet />
              </main>
            </div>
          </div>
        </TooltipProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
