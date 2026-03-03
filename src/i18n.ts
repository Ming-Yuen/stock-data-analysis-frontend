import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en.json";
import zhCommon from "./locales/zh-HK.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
    },
    zh: {
      common: zhCommon,
    },
  },
  lng: localStorage.getItem("app-lang") || "zh-HK",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  defaultNS: "common",
});

export default i18n;
