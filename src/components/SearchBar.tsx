import { Search } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, originFilter, setOriginFilter } = useLeads();
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold transition-all" />
      </div>
      <div className="hidden md:flex gap-1 bg-muted rounded-lg p-1">
        {(["all", "paid", "organic"] as const).map((f) => (
          <button key={f} onClick={() => setOriginFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              originFilter === f ? "bg-gold text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f === "all" ? "Todos" : f === "paid" ? "Anúncios" : "Orgânico"}
          </button>
        ))}
      </div>
    </div>
  );
}
