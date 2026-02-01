import { ApiResponse } from "./apiResponse";
import { StockSnapshot } from "./stock";

export interface WatchlistEnquiryResponse extends ApiResponse {
  watchItems: WatchItem[];
}

export interface WatchItem extends StockSnapshot {
  watched: boolean;
}
