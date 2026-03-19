import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Lead, MOCK_LEADS } from "@/data/leads";

interface LeadsContextType {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  moveLead: (leadId: string, newColumn: Lead["column"]) => void;
  attendLead: (leadId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  originFilter: "all" | "paid" | "organic";
  setOriginFilter: (f: "all" | "paid" | "organic") => void;
  filteredLeads: Lead[];
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export const useLeads = () => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be inside LeadsProvider");
  return ctx;
};

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "paid" | "organic">("all");

  const moveLead = useCallback((leadId: string, newColumn: Lead["column"]) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, column: newColumn, lastInteraction: new Date() } : l
      )
    );
  }, []);

  const attendLead = useCallback((leadId: string) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const phone = l.phone.replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=Olá ${l.name}!`, "_blank");
        return { ...l, lastInteraction: new Date() };
      })
    );
  }, []);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.origin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrigin = originFilter === "all" || l.originTag === originFilter;
    return matchesSearch && matchesOrigin;
  });

  return (
    <LeadsContext.Provider
      value={{ leads, setLeads, moveLead, attendLead, searchQuery, setSearchQuery, originFilter, setOriginFilter, filteredLeads }}
    >
      {children}
    </LeadsContext.Provider>
  );
}
