import { Suspense } from "react";
import SearchClient from "./SearchClient";
import Spinner from "@/components/ui/Spinner";

export const metadata = { title: "Search | Aura Goli" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] bg-canvas"><Spinner /></div>}>
      <SearchClient />
    </Suspense>
  );
}
