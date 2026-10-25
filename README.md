# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## 股票分析 API

分析頁面透過 `POST /analysis/report` 取得後端即時計算結果。請求使用 `figi`、`horizon`、`positionSelection` 與可選的帳戶風險資料；未提供 `analysisAsOf` 時由後端決定分析時間。

前端請求型別位於 `src/services/types/dto/analysis.ts`，須與後端 `AnalysisReportRequest` 同步。回應 `data` 只包含 `report`，其 context 包含 `analysisAsOf` 和 `knowledgeAsOf`。不傳送已移除的 `mode`／`persistSnapshot`，也不提供舊 snapshot／replay 操作；`snapshotId` 僅為後端相容欄位，不代表仍有快照 API。

持倉與帳戶風險輸入保留，由後端決定分析資格與交易建議；前端不自行補算缺失的分析數值。

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
