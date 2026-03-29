import type { Metadata } from "next";
import { QuoteExtractionFlow } from "@/components/quote-extraction-flow";

export const metadata: Metadata = {
  title: "Extrahovať hlášky",
  description: "Nájdite a extrahujte pamätné hlášky z filmov na YouTube",
};

export default function HlaskyPage() {
  return (
    <div className="min-h-screen">
      <QuoteExtractionFlow />
    </div>
  );
}
