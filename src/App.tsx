import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import DatabaseView from "./components/DatabaseView";
import NotFound from "./pages/NotFound";
import UploadView from '@/components/UploadView';
import TitleBar from '@/components/TitleBar';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        <TitleBar />
        <main className="flex-1 relative">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<UploadView />} />
              <Route path="/database" element={<DatabaseView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </main>
      </div>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
