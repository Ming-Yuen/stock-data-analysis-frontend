# stock-data-analysis-frontend 開發規範

在 StockProjects 共享工作區開發時，先閱讀並遵守 [根目錄 AGENTS.md](../AGENTS.md) 的共同操作與工作區保護規範。

## 股票分析展示

- 歷史估值、產業假設、市場同行比較及技術進出場條件各自呈現。估值觀察區與動態指標判讀採用後端結果，前端只格式化數字及本地化描述；不另算估值策略，不把缺值或舊值呈現成有效建議，不將證據分數標為勝率。

## DEV 提交與推送

- 前端提交不限制副檔名，可提交本次功能所需的 TypeScript、JavaScript、CSS、JSON、Markdown、套件及設定等檔案；不要把 backend 的提交副檔名白名單套用到前端。
- DEV 修改完成並通過相稱驗證後，自動 commit 並 push 到目前 DEV 分支所對應的 GitHub 分支，不需每次再確認；提交不代表部署。
- 每個 commit 聚焦本次相關修改，保留其他既有 staged／unstaged 內容；不因允許任何檔案類型而自動納入編譯產物、node_modules、臨時檔、日誌或本機憑證。提交前檢查實際檔案清單及憑證，不能只檢查副檔名。
- Commit 說明記錄修改原因、需求或行為變化、實際驗證及未驗證限制，方便後續以 git log／blame 追溯；不使用只有 updated 的說明，也不宣稱未執行的測試已通過。
- Push 失敗或遠端衝突時如實回報，不擅自 force push 或覆寫其他人的變更。
