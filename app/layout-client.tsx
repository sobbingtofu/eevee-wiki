"use client";
import TopNaviBar from "@/components/domain/layout/TopNaviBar";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactNode} from "react";

export default function RootLayoutClient({children}: {children: ReactNode}) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-screen h-screen overflow-hidden relative">
        <TopNaviBar />
        <main className="w-full h-full overflow-y-auto overflow-x-hidden pt-16 bg-background ">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
