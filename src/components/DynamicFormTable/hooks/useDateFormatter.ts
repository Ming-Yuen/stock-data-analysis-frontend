import { format, parse, parseISO } from "date-fns";

export interface UseDateFormatterReturn {
  formatDate: (
    value: any,
    sourceDateFormat?: string,
    displayDateFormat?: string
  ) => string;
}

export const useDateFormatter = (): UseDateFormatterReturn => {
  const formatDate = (
    value: any,
    sourceDateFormat?: string,
    displayDateFormat: string = "yyyy-MM-dd HH:mm:ss"
  ): string => {
    if (value == null || value === "") {
      return "-";
    }

    try {
      let date: Date;

      if (sourceDateFormat) {
        date = parse(String(value), sourceDateFormat, new Date());
      } else {
        date = parseISO(String(value));
      }

      return format(date, displayDateFormat);
    } catch {
      return String(value);
    }
  };

  return {
    formatDate,
  };
};
