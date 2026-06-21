import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const metadata = { title: "Search | Aura Goli" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchClient />
    </Suspense>
  );
}
