import en from "./en.json";
import zhCN from "./zh-CN.json";
import zhHK from "./zh-HK.json";

const taskCodes = [
  "STOCK_DAILY",
  "STOCK_QUOTE_DAILY",
  "MARKET_SENTIMENT_DAILY",
  "SEC_ETF_HOLDING_SYNC",
  "TREASURY_DAILY_SYNC",
  "MARKET_EVENT_DAILY_SYNC",
  "SEC_FINANCIAL_FACT_DAILY",
  "STOCK_VALUATION_SNAPSHOT_DAILY",
] as const;

describe("job task-code translations", () => {
  it("provides task-code and description labels in every supported language", () => {
    expect(en.job.columns.taskCode).toBe("Task code");
    expect(zhCN.job.columns.taskCode).toBe("任务代码");
    expect(zhHK.job.columns.taskCode).toBe("工作代碼");
  });

  it.each(taskCodes)("provides a translated description for %s", (taskCode) => {
    expect(en.job.description[taskCode]).toBeTruthy();
    expect(zhCN.job.description[taskCode]).toBeTruthy();
    expect(zhHK.job.description[taskCode]).toBeTruthy();
  });
});
