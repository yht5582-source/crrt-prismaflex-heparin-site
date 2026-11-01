# CRRT 計算器（Prismaflex／肝素版）

依「PrismaflexCRRT自動方案表單Heparin版.xlsx」公式製作的網頁工具，供透析護理人員核對機器設定，並附教學用的示範病例、考題與心智圖。

線上版本：<https://yht5582-source.github.io/crrt-prismaflex-heparin-site/>

> 本工具僅供核對與教學，不取代醫囑。實際處方、溶液種類、抗凝調整與監測，請依醫師醫囑與院內流程執行。

## 分頁

| 分頁 | 網址 | 內容 |
|---|---|---|
| 計算工具 | `#tool` | 輸入體重、模式、劑量、Qb、Net UF、Hct 與肝素，算出機器設定、送達劑量、FF、耗液量與肝素換算 |
| 示範病例 | `#cases` | 6 例虛構病例，表格由公式即時計算，可帶入計算工具 |
| 考題 | `#quiz` | 20 題（基礎 10、高階 10），作答後顯示解析與出處，不儲存作答紀錄 |
| 心智圖 | `#map` | 從開立處方到 HIT 與併發症，共 8 個主題，並列出參考文獻 |

從示範病例帶入的數值不會存檔，也不會覆蓋使用者原本的輸入。

## 公式

```text
目標 Effluent   = 體重 × 目標劑量
治療液總量      = MAX(Effluent − Net UF, 0)
Qd              = CVVHDF：治療液 × 透析液比例；CVVHD：治療液；CVVH：0
Qr              = 治療液 − Qd
Pre / Post      = Qr × Pre%；Qr − Pre
血漿流量 Qp     = Qb × 60 × (1 − Hct)
Pre 稀釋校正    = Qp ÷ (Qp + Pre)
預估送達劑量    = 處方劑量 × Pre 稀釋校正 × (1 − 中斷%)
過濾分率 FF     = (Qr + Net UF) ÷ (Qp + Pre)
肝素 U/kg/hr    = 維持滴注 ÷ 體重
肝素 mL/hr      = 維持滴注 ÷ 針筒濃度；Bolus mL = Bolus ÷ 濃度
```

## 工具的提示條件

- **需修正：** 必填欄位空白、體重為 0、Effluent ≤ Net UF、FF 超過 25%。
- **請確認：** Qb 不在 50–450 mL/min、預估送達劑量不在 20–25 mL/kg/hr、Hct 超出 0–80%、肝素高於 10 U/kg/hr。
- **提醒：** 已輸入肝素但未填針筒濃度。

## 已知限制

- **FF 門檻：** 文獻不一致。Neri 2016 為 FF <30%、濃縮比 <20–25%；Tandukar 2019 以 FF <20% 仍凝血作為考慮加強抗凝的條件。本工具以 25% 提示。
- **Qb 範圍：** 50–450 mL/min 尚未找到出處，僅作輸入提示。
- **Pre 稀釋校正：** 是估算值。KDIGO 指出 Pre 稀釋會使 effluent 高於實際劑量，但未提供公式；`crrt-core.js` 內的註解寫成 KDIGO 使用此分母，有待更正。
- **中斷比例：** 是手動輸入的估計值，不是機器量測值。
- **肝素以外的抗凝：** 工具不計算 citrate、argatroban 等藥物。
- **機型規格：** 未取得 Prismaflex 操作手冊，教學內容不引用機型規格與警報數值。

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 頁面結構 |
| `crrt-core.js` | 計算引擎 `CrrtCore` |
| `app.js` | 計算工具的互動、提示與本機儲存 |
| `teach-content.js` | 病例、考題、心智圖與參考文獻內容 |
| `teach.js` | 教學分頁的顯示與互動 |
| `styles.css`、`teach.css` | 樣式 |
| `tests.cjs` | 引擎與教學內容的測試 |

純靜態網站，沒有建置步驟，也不需安裝套件。

## 開發

```bash
node tests.cjs
```

```bash
python3 -m http.server 8826
```

- 測試會核對病例與計算題的數字是否與引擎一致，修改公式或內容後請重新執行。
- `index.html` 載入資源時帶有 `?v=` 版本號，每次發布要一起更新，避免瀏覽器讀到舊檔。
- 網站由 GitHub Pages 從 `main` 分支根目錄發布，推送到 `main` 就會上線。

## 參考文獻

- KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl 2012;2:1–138.
- Tandukar S, Palevsky PM. Continuous Renal Replacement Therapy: Who, When, Why, and How. Chest 2019;155:626–638.
- Neri M, et al. Nomenclature for renal replacement therapy in acute kidney injury: basic principles. Crit Care 2016;20:318.
- Zarbock A, et al. Effect of Regional Citrate Anticoagulation vs Systemic Heparin Anticoagulation During CKRT (RICH). JAMA 2020;324:1629–1639.
- VA/NIH Acute Renal Failure Trial Network (ATN). N Engl J Med 2008;359:7–20.
- RENAL Replacement Therapy Study Investigators. N Engl J Med 2009;361:1627–1638.
- Cuker A, et al. ASH 2018 guidelines: heparin-induced thrombocytopenia. Blood Adv 2018;2:3360–3392.
- Capuano I, et al. Heparin-induced thrombocytopenia: a challenging diagnosis in haemodialysis. Clin Kidney J 2026;19:sfag062.

## 授權

[MIT License](LICENSE)。授權範圍為本 repo 的程式碼與內容，不含上列文獻本身。
