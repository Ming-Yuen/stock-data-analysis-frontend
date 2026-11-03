export interface ValuationMultipleRange { low: number; high: number; }

export interface IndustryValuationProposal {
  id: string;
  status: "PENDING" | "PROCESSING" | "DRAFT" | "FAILED" | "APPROVED";
  valuationModelCode: string;
  metric: string;
  low: number | null;
  high: number | null;
  asOf: string;
  sourceUrls: string[];
  sources: Array<{ url: string; title: string; publishedDate: string; evidence: string }>;
  rationale: string | null;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  failureReason: string | null;
}

export interface IndustryValuationReview {
  industryCode: string;
  industry: string;
  valuationModelCode: string;
  primaryValuationMetric: string | null;
  current: {
    ranges: Record<string, ValuationMultipleRange | null>;
    asOf: string | null;
    sourceUrls: string[];
    rationale: string | null;
  };
  latestProposal: IndustryValuationProposal | null;
  availableActions: string[];
  unavailabilityReason: string | null;
}

export interface IndustryValuationApproval {
  review: IndustryValuationReview;
  recalculationRequired: boolean;
  recalculationTaskCode: string | null;
}
