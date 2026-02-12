import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Overview from "./pages/Overview";
import Clients from "./pages/Clients";
import Instances from "./pages/Instances";
import Inbox from "./pages/Inbox";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import FollowUps from "./pages/FollowUps";
import Converted from "./pages/Converted";
import Bot from "./pages/Bot";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WorkspaceProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route element={<MainLayout />}>
              <Route path="/overview" element={<Overview />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/instances" element={<Instances />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/follow-ups" element={<FollowUps />} />
              <Route path="/converted" element={<Converted />} />
              <Route path="/bot" element={<Bot />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
