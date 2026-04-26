"use client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ReactNode} from "react";

export default function RootLayoutClient({children}: {children: ReactNode}) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col w-screen h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
