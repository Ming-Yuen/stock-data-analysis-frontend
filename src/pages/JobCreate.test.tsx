import React from "react";
import { render } from "@testing-library/react";
import { JobCreatePage } from "./JobCreate";
import { Job } from "../services/types/dto/batch";
import { ActiveStatus } from "../services/types/enums/ActiveStatus";

jest.mock("../hooks/api/useApi", () => ({ useMutate: () => ({}) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const menu = { menuId: "jobs", name: "Jobs", path: "/jobs" };

function startDate(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[name="cronSchedule.startDate"]')?.value;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-03T16:30:00Z"));
});

afterEach(() => jest.useRealTimers());

test("defaults the start date to the next calendar day after Hong Kong midnight", () => {
  const { container } = render(<JobCreatePage menuTree={menu} />);

  expect(startDate(container)).toBe("2026-11-04");
});

test("keeps the saved start date when editing an existing job", () => {
  const job: Job = {
    id: 1,
    taskCode: "STOCK_DAILY",
    taskGroup: "SCHEDULE",
    jobParams: {},
    jobClassPath: "StockDailyTask",
    cronExpression: "0 0 12 * * ?",
    startTime: "2026-10-26T00:00:00",
    activeStatus: ActiveStatus.ACTIVE,
    lastExecutionStatus: "",
    lastExecStartTime: "",
    lastExecEndTime: "",
    resultMessage: "",
  };
  const { container } = render(<JobCreatePage menuTree={menu} job={job} />);

  expect(startDate(container)).toBe("2026-10-26");
});
