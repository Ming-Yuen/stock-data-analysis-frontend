import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en.json";
import zhCommon from "./locales/zh-HK.json";
import cnCommon from "./locales/zh-CN.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
    },
    "zh-HK": {
      common: zhCommon,
    },
    "zh-CN": {
      common: cnCommon,
    },
  },
  lng: localStorage.getItem("app-lang") || "zh-HK",
  fallbackLng: "en",
  supportedLngs: ["en", "zh-HK", "zh-CN"],
  ns: ["common"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;