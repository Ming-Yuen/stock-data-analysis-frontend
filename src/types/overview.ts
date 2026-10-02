export interface DashboardResponse {
    snapshotMeta: SnapshotMeta;
    tapeRows: TapeRow[];
    indexRows: IndexRow[];
    etfRows: EtfRow[];
    alerts: string[];
    events: EventItem[];
    signalRows: SignalRow[];
    fearGreedComponents: FearGreedComponent[];
    marketSummary: MarketSummary;
    executionBias: ExecutionBias;
  }
  
  export interface SnapshotMeta {
    updateTime: string;
    marketDate: string;
    sources: string[];
  }
  
  export interface TapeRow {
    symbol: string;
    value: string;
    change: string;
    positive: boolean;
  }
  
  export interface IndexRow {
    name: string;
    symbol: string;
    value: string;
    day: string;
    trend: string;
    note: string;
  }
  
  export interface EtfRow {
    ticker: string;
    price: string;
    day: string;
    rsi: string;
    bias: string;
    ma20Deviation: string;
    volumeRatio5d: string;
    note: string;
    source: string;
    time: string;
  }
  
  export interface EventItem {
    name: string;
    time: string;
    level: string;
  }
  
  export interface SignalRow {
    name: string;
    value: string;
    status: string;
    source: string;
  }
  
  export interface FearGreedComponent {
    name: string;
    value: string;
    desc: string;
  }
  
  export interface MarketSummary {
    title: string;
    description: string;
    tag: string;
  }
  
  export interface ExecutionBias {
    title: string;
    description: string;
  }