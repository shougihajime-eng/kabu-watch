import { StockDetail } from "@/components/StockDetail";

type Params = { params: Promise<{ ticker: string }> };

export default async function StockPage({ params }: Params) {
  const { ticker } = await params;
  return <StockDetail ticker={decodeURIComponent(ticker)} />;
}
