export interface DashboardResponse {
    snapshotMeta: SnapshotMeta;
    tapeRows: TapeRow[];
    indexRows: IndexRow[];
    etfRows: EtfRow[];
    alerts: MessageItem[];
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
    nameCode: string;
    symbol: string;
    value: string;
    day: string;
    trend: string;
    noteCode: string;
  }
  
  export interface EtfRow {
    ticker: string;
    price: string;
    day: string;
    rsi: string;
    biasCode: string;
    ma20Deviation: string;
    volumeRatio5d: string;
    noteCode: string;
    sourceCode: string;
    time: string;
  }
  
  export interface EventItem {
    id: string;
    title: string | null;
    titleCode: string | null;
    categoryCode: string;
    startsAt: string;
    levelCode: string;
    symbol: string | null;
    source: string | null;
    sourceUrl: string | null;
    statusCode: string;
    allDay: boolean;
  }
  
  export interface SignalRow {
    code: "FEAR_GREED" | "CNN_VIX_SCORE" | "CNN_PUT_CALL_SCORE" | "CNN_MARKET_BREADTH_SCORE";
    value: string;
    statusCode: string;
    sourceCode: string;
  }
  
  export interface FearGreedComponent {
    code: string;
    value: string;
    statusCode: string;
  }
  
  export interface MarketSummary {
    titleCode: string;
    description: MessageItem;
    tag: MessageItem;
  }
  
  export interface ExecutionBias {
    titleCode: string;
    descriptionCode: string;
  }

  export interface MessageItem {
    code: string;
    params: Record<string, string | number>;
  }
