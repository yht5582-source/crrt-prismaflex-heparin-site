"use strict";

/*TEACH-START*/
(function attachCrrtTeachContent(globalScope) {
  const SOURCES = {
    KDIGO: { label: "KDIGO AKI 2012", text: "KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl 2012;2:1–138（第 5.3、5.4、5.8 章）。", href: "https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf" },
    TP: { label: "Tandukar 2019", text: "Tandukar S, Palevsky PM. Continuous Renal Replacement Therapy: Who, When, Why, and How. Chest 2019;155:626–638.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6435902/" },
    NERI: { label: "Neri 2016", text: "Neri M, et al. Nomenclature for renal replacement therapy in acute kidney injury: basic principles. Crit Care 2016;20:318.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5056503/" },
    RICH: { label: "RICH 2020", text: "Zarbock A, et al. Effect of Regional Citrate Anticoagulation vs Systemic Heparin Anticoagulation During CKRT. JAMA 2020;324:1629–1639.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7585036/" },
    ATN: { label: "ATN 2008", text: "VA/NIH Acute Renal Failure Trial Network. Intensity of renal support in critically ill patients with AKI. N Engl J Med 2008;359:7–20.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2574780/" },
    RENAL: { label: "RENAL 2009", text: "RENAL Replacement Therapy Study Investigators. Intensity of continuous renal-replacement therapy in critically ill patients. N Engl J Med 2009;361:1627–1638.", href: "https://pubmed.ncbi.nlm.nih.gov/19846848/" },
    ASH: { label: "ASH 2018", text: "Cuker A, et al. ASH 2018 guidelines: heparin-induced thrombocytopenia. Blood Adv 2018;2:3360–3392.", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6258919/" },
    CKJ: { label: "Capuano 2026", text: "Capuano I, et al. Heparin-induced thrombocytopenia: a challenging diagnosis in haemodialysis. Clin Kidney J 2026;19:sfag062（Table 1，4Ts）。", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13153468/" },
  };

  const BASE = {
    mode: "CVVHDF", hours: 24, netUf: 100, dialysateRatio: 50, preRatio: 70,
    hematocritPercent: 30, downtimePercent: 0, heparinBolus: 0, heparinInfusion: 0, heparinConcentration: null,
  };

  const rx = (values) => ({ ...BASE, ...values });

  // Each scenario runs through CrrtCore live; `expect` values are asserted in tests.cjs.
  const CASES = [
    {
      id: "c1",
      title: "敗血症 AKI 首次上機：從體重算到針筒速率",
      tags: ["起始處方", "肝素換算"],
      story: "58 歲、70 kg，敗血性休克併少尿型 AKI，K 6.4 mmol/L，使用 norepinephrine，lactate 9 mmol/L、肝功能急性惡化。血小板 180 ×10⁹/L、INR 1.2、aPTT 正常，無出血。醫師考量休克與肝功能下的 citrate 代謝風險，決定用肝素。",
      ask: "處方劑量 25 mL/kg/hr 夠嗎？肝素 500 U/hr 落在哪個範圍？",
      scenarios: [
        { label: "起始醫囑", input: rx({ weightKg: 70, targetDose: 25, bloodFlow: 200, netUf: 50, heparinBolus: 2000, heparinInfusion: 500, heparinConcentration: 100 }), expect: { totalEffluent: 1750, qd: 850, qrPre: 595, qrPost: 255, estimatedDeliveredDose: 23.3, filtrationFraction: 10, heparinPerKgHr: 7.1, heparinRateMl: 5, heparinBolusMl: 20 } },
        { label: "預估中斷 5%", input: rx({ weightKg: 70, targetDose: 28, bloodFlow: 200, netUf: 50, downtimePercent: 5, heparinBolus: 2000, heparinInfusion: 500, heparinConcentration: 100 }), expect: { totalEffluent: 1960, estimatedDeliveredDose: 24.6, filtrationFraction: 11.1 } },
      ],
      points: [
        "Effluent = 70 × 25 = 1750 mL/hr；扣掉 Net UF 50 後的 1700 mL/hr 才分給 Qd 與 Qr。",
        "校正 Pre 稀釋後送達約 23.3 mL/kg/hr，落在 20–25。KDIGO 指出實務上送達常低於處方，要達到 20–25 通常需處方 25–30。",
        "肝素 500 U/hr ÷ 70 kg = 7.1 U/kg/hr，在 Tandukar 回顧列的 5–10 U/kg/hr 內；2000 U 約 29 U/kg，接近其 30 U/kg 的 bolus。",
      ],
      trap: "KDIGO 對無出血風險、可用 citrate 者建議 citrate 優先（5.3.2.2，2B）。選肝素要有理由，本例的理由是 citrate 代謝風險。",
      sources: ["KDIGO", "TP"],
    },
    {
      id: "c2",
      title: "數字看起來對，送達卻不足：全 Pre 稀釋＋低 Qb",
      tags: ["Pre 稀釋", "送達劑量", "管路"],
      story: "63 歲、80 kg，股靜脈導管反覆 access 警報，Qb 只能開到 120 mL/min。為了減少凝血，CVVH 設為 100% Pre，處方 25 mL/kg/hr，Hct 30%。",
      ask: "螢幕上的處方劑量是 25，病人實際得到多少？先修哪裡？",
      scenarios: [
        { label: "目前設定", input: rx({ weightKg: 80, mode: "CVVH", preRatio: 100, targetDose: 25, bloodFlow: 120 }), expect: { totalEffluent: 2000, qrPre: 1900, qrPost: 0, predilutionFactor: 0.726, estimatedDeliveredDose: 18.2, filtrationFraction: 28.8 } },
        { label: "處理導管後", input: rx({ weightKg: 80, mode: "CVVH", preRatio: 100, targetDose: 30, bloodFlow: 200 }), expect: { totalEffluent: 2400, qrPre: 2300, predilutionFactor: 0.785, estimatedDeliveredDose: 23.6, filtrationFraction: 22.4 } },
      ],
      points: [
        "Qp = 120 × 60 × 0.7 = 5040 mL/hr；校正係數 5040 ÷ (5040 + 1900) = 72.6%，送達只剩 18.2。",
        "Pre 稀釋減少血液濃縮，但同時稀釋溶質、降低清除；Post 沒有這個稀釋效應。",
        "Qb 低同時壓低校正係數又推高 FF（本例 28.8%）。導管要能維持 200–300 mL/min，做不到就可能要盡快換管。",
      ],
      trap: "只把處方調高到 35 而不修 Qb：送達約 22.8，但 FF 升到 36.2%，濾器更容易凝。先修血流，再調處方。",
      sources: ["TP", "NERI", "KDIGO"],
    },
    {
      id: "c3",
      title: "24 小時凝三次濾器，先別急著加肝素",
      tags: ["過濾分率", "濾器壽命"],
      story: "47 歲、90 kg，橫紋肌溶解併 AKI，CVVH 全 Post，Qb 150 mL/min，處方 30 mL/kg/hr，Net UF 200 mL/hr，Hct 38%。肝素 900 U/hr，aPTT 已達 1.8 倍上限，血小板穩定、使用肝素第 2 天。24 小時內換了 3 次濾器，估中斷 15%。",
      ask: "問題在抗凝不足，還是在流量設計？",
      scenarios: [
        { label: "目前設定", input: rx({ weightKg: 90, mode: "CVVH", preRatio: 0, targetDose: 30, bloodFlow: 150, netUf: 200, hematocritPercent: 38, downtimePercent: 15, heparinInfusion: 900, heparinConcentration: 100 }), expect: { totalEffluent: 2700, qrPost: 2500, filtrationFraction: 48.4, estimatedDeliveredDose: 25.5, heparinPerKgHr: 10, heparinRateMl: 9 } },
        { label: "改流量分配", input: rx({ weightKg: 90, mode: "CVVHDF", dialysateRatio: 60, preRatio: 70, targetDose: 27, bloodFlow: 220, netUf: 200, hematocritPercent: 38, downtimePercent: 5, heparinInfusion: 600, heparinConcentration: 100 }), expect: { totalEffluent: 2430, qd: 1338, qrPre: 624.4, filtrationFraction: 12.4, estimatedDeliveredDose: 23.8, heparinPerKgHr: 6.7, heparinRateMl: 6 } },
      ],
      points: [
        "FF = 2700 ÷ (150 × 60 × 0.62) = 48.4%：全部水分都從膜上濾出，血液在濾器內明顯濃縮。",
        "把部分劑量改由透析液承擔、提高 Qb、改一部分 Pre，FF 降到 12.4%；Tandukar 列的防凝策略正是這幾項。",
        "排除導管問題、血流已最大化、FF 仍 <20% 還是凝，才考慮開始或加強抗凝。本例肝素反而可以依醫囑評估下調。",
      ],
      trap: "血小板穩定、才第 2 天，目前不像 HIT；但 KDIGO 提醒反覆提早凝濾器也要想到 HIT，所以血小板要持續追。",
      sources: ["TP", "NERI", "KDIGO"],
    },
    {
      id: "c4",
      title: "反覆外出檢查，劑量悄悄流失",
      tags: ["中斷時間", "劑量"],
      story: "71 歲、65 kg，腹腔敗血症，每天外出 CT 或進開刀房，加上換管，估每日中斷約 20%（4.8 小時）。CVVHDF 處方 25 mL/kg/hr，Qb 180 mL/min。團隊有人提議直接開到 40。",
      ask: "該補多少？開到 40 比較保險嗎？",
      scenarios: [
        { label: "處方 25", input: rx({ weightKg: 65, targetDose: 25, bloodFlow: 180, downtimePercent: 20 }), expect: { totalEffluent: 1625, estimatedDeliveredDose: 18.7, filtrationFraction: 10.7 } },
        { label: "處方 30", input: rx({ weightKg: 65, targetDose: 30, bloodFlow: 180, downtimePercent: 20 }), expect: { totalEffluent: 1950, estimatedDeliveredDose: 22.1, filtrationFraction: 12.5 } },
        { label: "處方 40", input: rx({ weightKg: 65, targetDose: 40, bloodFlow: 180, downtimePercent: 20 }), expect: { totalEffluent: 2600, estimatedDeliveredDose: 28.7, filtrationFraction: 16 } },
      ],
      points: [
        "處方 25 乘上 Pre 校正與 80% uptime，只剩 18.7。KDIGO 提到 RENAL 實際送達約為處方的 88%（低劑量組）。",
        "處方 30 送達 22.1，回到 20–25。先處理能減少的中斷（檢查併同、導管、濾器），再用處方補償。",
        "ATN（35 vs 20）與 RENAL（40 vs 25）都未改善死亡率；RENAL 高劑量組低血磷較多。開到 40 沒有存活好處。",
      ],
      trap: "「預估中斷比例」是輸入值，不是機器量到的。要用實際治療時數回頭核對，別讓估計值取代紀錄。",
      sources: ["KDIGO", "ATN", "RENAL"],
    },
    {
      id: "c5",
      title: "解黑便、aPTT 爆表：針筒濃度差十倍",
      tags: ["給藥錯誤", "出血"],
      story: "66 歲、50 kg，瘦小女性，術後第 1 天。醫囑肝素 500 U/hr（10 U/kg/hr），交班記錄以 100 U/mL 換算為 5 mL/hr。今晨解黑便、Hct 由 30% 掉到 24%，aPTT 超過上限。核對發現針筒實際配成 1000 U/mL，幫浦仍是 5 mL/hr。",
      ask: "實際給了多少？停肝素後機器怎麼設？",
      scenarios: [
        { label: "實際給藥", input: rx({ weightKg: 50, targetDose: 28, bloodFlow: 150, netUf: 50, hematocritPercent: 24, heparinInfusion: 5000, heparinConcentration: 1000 }), expect: { totalEffluent: 1400, heparinPerKgHr: 100, heparinRateMl: 5, filtrationFraction: 9.9 } },
        { label: "無抗凝設定", input: rx({ weightKg: 50, mode: "CVVHD", targetDose: 27, bloodFlow: 200, netUf: 50, hematocritPercent: 24, downtimePercent: 10 }), expect: { totalEffluent: 1350, qd: 1300, qr: 0, heparinPerKgHr: 0, estimatedDeliveredDose: 24.3, filtrationFraction: 0.5 } },
      ],
      points: [
        "5 mL/hr × 1000 U/mL = 5000 U/hr = 100 U/kg/hr，是醫囑的 10 倍。工具的「肝素 U/kg/hr」警示能抓到，但前提是濃度要輸入實際配製值。",
        "活動性出血或近 7 天出血屬高出血風險：KDIGO 建議無抗凝，或無禁忌時用 regional citrate（5.3.3.1，2C）。",
        "無抗凝時的防凝措施：導管功能良好、高血流、Pre 稀釋或以擴散為主、減少血氣接觸、快速處理警報。本例改 CVVHD，FF 只剩 0.5%。",
      ],
      trap: "別改用肝素＋protamine 的 regional heparinization：KDIGO 建議避免（5.3.3.2，2C），因為有反彈風險，且同時承受兩種藥的副作用。",
      sources: ["KDIGO"],
    },
    {
      id: "c6",
      title: "第 7 天血小板掉一半，濾器又凝：想到 HIT",
      tags: ["HIT", "4Ts", "非肝素抗凝"],
      story: "55 歲、75 kg，肝素第 7 天。血小板 210 → 70 ×10⁹/L（降 67%），濾器近 48 小時凝 3 次，超音波證實右頸導管旁新血栓。仍有敗血症，總膽紅素 3.2 mg/dL。Hct 26%，無活動性出血。",
      ask: "4Ts 幾分？除了停點滴，還有什麼要停？流量要改嗎？",
      scenarios: [
        { label: "停肝素前", input: rx({ weightKg: 75, targetDose: 28, bloodFlow: 200, netUf: 80, hematocritPercent: 26, downtimePercent: 8, heparinInfusion: 600, heparinConcentration: 100 }), expect: { totalEffluent: 2100, estimatedDeliveredDose: 23.9, filtrationFraction: 11.4, heparinPerKgHr: 8, heparinRateMl: 6 } },
        { label: "停肝素後", input: rx({ weightKg: 75, targetDose: 28, bloodFlow: 200, netUf: 80, hematocritPercent: 26, downtimePercent: 8 }), expect: { totalEffluent: 2100, estimatedDeliveredDose: 23.9, filtrationFraction: 11.4, heparinPerKgHr: 0 } },
      ],
      points: [
        "4Ts = 血小板 2（降 >50%、最低 ≥20）＋時間 2（5–10 天）＋血栓 2（證實新血栓）＋其他原因 1（敗血症）＝ 7 分，高機率（≥6）。",
        "停所有肝素，包括導管 heparin lock；開始治療劑量的非肝素抗凝並送免疫分析。透析迴路需抗凝時，ASH 建議 argatroban、danaparoid 或 bivalirudin（Rec 6.1）。",
        "ASH Table 2：argatroban 不給 bolus，一般 2 μg/kg/min；膽紅素 >1.5 mg/dL 時 0.5–1.2 μg/kg/min（本例 2.25–5.4 mg/hr），aPTT 目標基準值 1.5–3 倍。肝功能差也可考慮 bivalirudin。",
        "不常規輸血小板（出血或高出血風險才考慮）；血小板回到約 ≥150 前不開始 warfarin 類藥物。",
      ],
      trap: "別改用 citrate 了事：ASH 指出急性 HIT 需要全身性抗凝，regional citrate 不適合。本工具只算肝素，非肝素藥物請依藥師與院內流程。",
      sources: ["KDIGO", "ASH", "CKJ", "TP"],
    },
  ];

  const bq = BASE;
  // `calc` ties a numeric answer to the engine; tests.cjs asserts field ≈ value.
  const QUIZ = [
    { level: "基礎", q: "60 kg，CVVHDF 目標 25 mL/kg/hr，Net UF 100 mL/hr，透析液比例 50%。Qd 應設多少？", options: ["750 mL/hr", "700 mL/hr", "650 mL/hr", "1400 mL/hr"], answer: "B", why: "Effluent 1500 先扣 Net UF 得治療液 1400，50% 給透析液 = 700。直接用 1500 × 50% 是常見錯誤。", calc: { input: { ...bq, weightKg: 60, targetDose: 25, bloodFlow: 180 }, field: "qd", value: 700 }, sources: ["NERI"] },
    { level: "基礎", q: "KDIGO 對 AKI 病人 CRRT 建議的劑量，正確的是？", options: ["處方 20–25，送達不必核對", "處方 35–40 mL/kg/hr 才足夠", "送達 20–25，通常需處方較高", "依 Kt/V 每週 3.9 評估"], answer: "C", why: "5.8.4（1A）：送達 effluent 20–25 mL/kg/hr，通常需要較高的處方量；文中舉例處方 25–30。Kt/V 3.9 是間歇或延長式 RRT 的目標。", sources: ["KDIGO"] },
    { level: "基礎", q: "RICH 試驗比較 regional citrate 與全身肝素，結果何者正確？", options: ["citrate 濾器壽命較長、出血較少，但新感染較多", "citrate 明確降低 90 天死亡率", "兩組濾器壽命相同，只差在出血", "肝素組濾器壽命較長、感染較少"], answer: "A", why: "中位濾器壽命 47 vs 26 小時；出血 5.1% vs 16.9%；新感染 68.0% vs 55.4%。90 天死亡率 51.2% vs 53.6%，試驗提前終止、檢定力不足，不能下死亡率結論。", sources: ["RICH"] },
    { level: "基礎", q: "關於置換液由濾器前（Pre）或濾器後（Post）給予，何者正確？", options: ["Post 會稀釋溶質，清除效率較低", "Pre 清除較佳，且濾器壽命也較差", "兩者對濾器內血液濃縮影響相同", "Pre 減少血液濃縮，但同時降低清除"], answer: "D", why: "Pre 稀釋進入濾器的血液，可減少濃縮與纖維阻塞，但也稀釋溶質，固定超濾量下有效清除下降；Post 無此稀釋效應，但濾器壽命較差。", sources: ["TP", "NERI"] },
    { level: "基礎", q: "本工具（同 Neri 2016）計算過濾分率 FF，分母是什麼？", options: ["Qb × (1 − Hct) + Pre", "Qb × 60", "Effluent + Pre", "Qd + Qr + Net UF"], answer: "A", why: "FF = 總超濾 ÷ 進入濾器的血漿流量（Qb × (1 − Hct) + Pre），單位要一致。Qd 不走超濾，不算進分子。", sources: ["NERI"] },
    { level: "基礎", q: "75 kg，肝素維持 600 U/hr，換算是多少 U/kg/hr？", options: ["6 U/kg/hr", "7 U/kg/hr", "8 U/kg/hr", "12 U/kg/hr"], answer: "C", why: "600 ÷ 75 = 8 U/kg/hr，在 Tandukar 回顧列的 5–10 U/kg/hr 內；該文也指出各院方案差異很大。", calc: { input: { ...bq, weightKg: 75, targetDose: 25, bloodFlow: 200, heparinInfusion: 600 }, field: "heparinPerKgHr", value: 8 }, sources: ["TP"] },
    { level: "基礎", q: "肝素 500 U/hr，針筒濃度 100 U/mL，幫浦應設多少？", options: ["0.5 mL/hr", "5 mL/hr", "10 mL/hr", "50 mL/hr"], answer: "B", why: "500 ÷ 100 = 5 mL/hr。換藥或換針筒時，濃度要重新核對。", calc: { input: { ...bq, weightKg: 60, targetDose: 25, bloodFlow: 180, heparinInfusion: 500, heparinConcentration: 100 }, field: "heparinRateMl", value: 5 }, sources: [] },
    { level: "基礎", q: "無出血風險、凝血正常、未用全身抗凝，也無 citrate 禁忌的 CRRT 病人，KDIGO 建議？", options: ["一律不用抗凝", "優先用低分子肝素", "優先用未分劃肝素", "優先用 regional citrate"], answer: "D", why: "5.3.2.2（2B）建議 citrate 優於肝素；有 citrate 禁忌才用未分劃或低分子肝素（5.3.2.3，2C）。", sources: ["KDIGO"] },
    { level: "基礎", q: "依 Tandukar 回顧，CRRT 迴路凝血最常見的原因是？", options: ["導管功能不良造成血流受限與警報", "肝素劑量不足", "透析液比例過高", "病人體重估計錯誤"], answer: "A", why: "流量受限和壓力警報會中斷血流。維持不了 200–300 mL/min 時，可能需要盡快換管。", sources: ["TP"] },
    { level: "基礎", q: "懷疑 HIT 時，下列何者也必須停用？", options: ["生理食鹽水沖管", "碳酸氫鹽置換液", "導管的 heparin lock", "所有抗生素"], answer: "C", why: "KDIGO 明確指出所有肝素都要停，包括透析或其他導管的 heparin lock。", sources: ["KDIGO"] },

    { level: "高階", q: "80 kg，CVVH 全 Pre，目標 25，Net UF 100，Qb 120，Hct 30%。工具估的送達劑量約多少？", options: ["25.0 mL/kg/hr", "23.5 mL/kg/hr", "18.2 mL/kg/hr", "15.4 mL/kg/hr"], answer: "C", why: "Qp 5040；Pre 1900；校正 5040 ÷ 6940 = 72.6%；25 × 72.6% ≈ 18.2。", calc: { input: { ...bq, weightKg: 80, mode: "CVVH", preRatio: 100, targetDose: 25, bloodFlow: 120 }, field: "estimatedDeliveredDose", value: 18.2 }, sources: ["KDIGO"] },
    { level: "高階", q: "承上題（送達 18.2、FF 28.8%）。哪個調整能同時讓送達回到 20–25、FF ≤25%？", options: ["Qb 200、目標 30", "Qb 120、目標 35", "Qb 120、目標 20", "Qb 120、改 100% Post"], answer: "A", why: "Qb 200、目標 30：送達 23.6、FF 22.4%。只加到 35：送達 22.8 但 FF 36.2%。降到 20：送達 15.4。Qb 120 全 Post：送達 25 但 FF 約 39.7%。", calc: { input: { ...bq, weightKg: 80, mode: "CVVH", preRatio: 100, targetDose: 30, bloodFlow: 200 }, field: "estimatedDeliveredDose", value: 23.6 }, sources: ["TP"] },
    { level: "高階", q: "60 kg，CVVHDF 目標 25、Qb 180、Hct 30%。Net UF 由 100 改為 300 mL/hr，且目標不變，工具的結果會？", options: ["Effluent 增加 200 mL/hr", "Qd 與 Qr 都不變", "FF 由 9.9% 下降", "Effluent 不變，Qd 和 Qr 各減 100，FF 升到 11.3%"], answer: "D", why: "Net UF 含在 effluent 內，總量固定時會擠壓治療液。Qd、Qr 由 700 降到 600，FF 由 9.9% 升到 11.3%。", calc: { input: { ...bq, weightKg: 60, targetDose: 25, bloodFlow: 180, netUf: 300 }, field: "filtrationFraction", value: 11.3 }, sources: ["NERI"] },
    { level: "高階", q: "CVVH 全 Post，FF 48%，導管通暢，24 小時凝 3 次，aPTT 已 1.8 倍上限。第一步優先？", options: ["肝素再加量，目標 aPTT 3 倍", "降低 FF：提高 Qb、改部分 Pre 或由 Qd 承擔", "輸注血小板", "降低 Qb 以減少警報"], answer: "B", why: "FF 過高造成濾器內濃縮，是流量問題。Tandukar 列的策略是高血流、CVVHD 或 Pre 降 FF。排除這些後才考慮加強抗凝。", sources: ["TP"] },
    { level: "高階", q: "65 kg，處方 25、Qb 180、中斷約 20%，估送達 18.7。哪個處理最符合文獻？", options: ["不必處理，處方已達 25", "直接開到 40，取得更多清除", "把 Qb 降低以減少中斷", "減少可避免的中斷，處方調到 30（估送達 22.1）"], answer: "D", why: "KDIGO：要達到送達 20–25，處方可能需 25–30。ATN、RENAL 的高劑量組都沒有改善死亡率，RENAL 高劑量組低血磷較多。", calc: { input: { ...bq, weightKg: 65, targetDose: 30, bloodFlow: 180, downtimePercent: 20 }, field: "estimatedDeliveredDose", value: 22.1 }, sources: ["KDIGO", "ATN", "RENAL"] },
    { level: "高階", q: "50 kg，醫囑肝素 500 U/hr。幫浦 5 mL/hr，但針筒實際是 1000 U/mL。實際劑量？", options: ["5000 U/hr（100 U/kg/hr）", "500 U/hr（10 U/kg/hr）", "1000 U/hr（20 U/kg/hr）", "50 U/hr（1 U/kg/hr）"], answer: "A", why: "5 × 1000 = 5000 U/hr，是醫囑的 10 倍。若工具濃度仍填 100，算出來會看似正常。", calc: { input: { ...bq, weightKg: 50, targetDose: 25, bloodFlow: 150, heparinInfusion: 5000, heparinConcentration: 1000 }, field: "heparinPerKgHr", value: 100 }, sources: [] },
    { level: "高階", q: "導管正常、血流已最大化、FF 15%，濾器仍反覆提早凝血；血小板穩定。下一步最合理？", options: ["繼續提高 FF 以增加清除", "考慮開始或加強抗凝", "停止 CRRT 並改為不透析", "把全部置換液改為 Post"], answer: "B", why: "Tandukar：無導管問題、血流最大化且 FF <20% 時，應考慮開始或加強抗凝。KDIGO 也提醒要留意 HIT，血小板持續追蹤。", sources: ["TP", "KDIGO"] },
    { level: "高階", q: "近 7 天有出血的病人，有人提議「濾器前肝素＋濾器後 protamine」。KDIGO 的立場與理由？", options: ["建議使用，出血最少", "僅限 HIT 病人使用", "建議避免：有反彈風險，並同時承受兩藥副作用", "建議作為第一線，優於 citrate"], answer: "C", why: "5.3.3.2（2C）。肝素半衰期比 protamine 長，有反彈；還有 HIT 與 protamine 的過敏、低血壓、肺血管收縮等風險。高出血風險者考慮無抗凝或 citrate。", sources: ["KDIGO"] },
    { level: "高階", q: "肝素第 8 天，血小板 240 → 90 ×10⁹/L，證實新 DVT，同時有敗血症。4Ts 與處置？", options: ["4 分，繼續肝素並送驗", "5 分，先輸血小板", "3 分，不必檢驗", "7 分，停肝素、開始非肝素抗凝並送免疫分析"], answer: "D", why: "血小板 2（降 62.5%、最低 ≥20）＋時間 2＋血栓 2＋其他原因 1（敗血症，可能）＝ 7。≥6 為高機率。ASH：高機率者停肝素並開始治療劑量非肝素抗凝；不常規輸血小板。", sources: ["CKJ", "ASH"] },
    { level: "高階", q: "急性 HIT 併血栓，需 CRRT 迴路抗凝，總膽紅素 3.2 mg/dL。依 ASH 2018，何者最合理？", options: ["改 regional citrate，不需全身抗凝", "選 argatroban 減量（0.5–1.2 μg/kg/min）或 bivalirudin 並監測", "argatroban 2 μg/kg/min，加 bolus", "低分子肝素，較少造成 HIT"], answer: "B", why: "ASH 指出 citrate 不適合急性 HIT（需全身抗凝）。Table 2：argatroban 不給 bolus，膽紅素 >1.5 時 0.5–1.2 μg/kg/min。Tandukar：肝衰竭併 AKI 時偏好 bivalirudin。肝素類都要停。", sources: ["ASH", "TP"] },
  ];

  const MAP = {
    root: "Prismaflex CRRT × 肝素",
    branches: [
      { title: "1. 開立處方", tone: "teal", leaves: [
        { t: "目標：送達 20–25 mL/kg/hr", s: "KDIGO 5.8.4" },
        { t: "處方通常需 25–30 補償" , s: "KDIGO" },
        { t: "35–40 未改善死亡率", s: "ATN／RENAL" },
        { t: "模式：CVVH／CVVHD／CVVHDF" },
      ] },
      { title: "2. 流量分配", tone: "blue", leaves: [
        { t: "Effluent = 體重 × 目標 = Qd + Qr + Net UF" },
        { t: "Net UF 增加 → 治療液被擠壓" },
        { t: "Pre：少濃縮、濾器久、清除降", s: "Neri" },
        { t: "Post：清除好、較易阻塞", s: "Neri" },
      ] },
      { title: "3. 算送達劑量", tone: "orange", leaves: [
        { t: "Qp = Qb × 60 × (1 − Hct)" },
        { t: "校正 = Qp ÷ (Qp + Pre)" },
        { t: "再乘 uptime（1 − 中斷%）" },
        { t: "低 Qb、高 Hct、高 Pre → 校正變差" },
      ] },
      { title: "4. 濾器凝血", tone: "red", leaves: [
        { t: "先看導管：能否維持 200–300 mL/min", s: "Tandukar" },
        { t: "再看 FF：提高 Qb、Pre、改 Qd", s: "Tandukar" },
        { t: "FF 門檻不一：工具 25%；<30%；<20%", s: "Neri／Tandukar" },
        { t: "都排除才加強抗凝；反覆凝血想到 HIT", s: "KDIGO" },
      ] },
      { title: "5. 選抗凝", tone: "teal", leaves: [
        { t: "無出血風險：citrate 優先（2B）", s: "KDIGO 5.3.2.2" },
        { t: "citrate 禁忌：肝素（2C）", s: "KDIGO 5.3.2.3" },
        { t: "高出血風險：無抗凝或 citrate", s: "KDIGO 5.3.3" },
        { t: "避免 regional heparin（2C）", s: "KDIGO 5.3.3.2" },
      ] },
      { title: "6. 肝素計算與監測", tone: "blue", leaves: [
        { t: "方案差異大：低劑量 300–500 U/hr，或 5–10 U/kg/hr", s: "Tandukar" },
        { t: "U/kg/hr = 維持 ÷ 體重" },
        { t: "mL/hr = 維持 ÷ 實際濃度；十倍錯誤" },
        { t: "aPTT 目標依院內；追血小板", s: "KDIGO／RICH" },
      ] },
      { title: "7. HIT", tone: "red", leaves: [
        { t: "4Ts ≥6 高、4–5 中、0–3 低", s: "Capuano" },
        { t: "停所有肝素，含 heparin lock", s: "KDIGO" },
        { t: "迴路：argatroban、danaparoid、bivalirudin", s: "ASH 6.1" },
        { t: "急性 HIT 不靠 citrate；不常規輸血小板", s: "ASH" },
      ] },
      { title: "8. 其他併發症", tone: "orange", leaves: [
        { t: "低血磷（高劑量組較多）", s: "RENAL" },
        { t: "低血鉀、低血鎂、低體溫、低血壓", s: "Tandukar" },
        { t: "藥物清除：抗生素劑量不足風險", s: "Tandukar" },
        { t: "導管感染、血栓、空氣栓塞", s: "Tandukar" },
      ] },
    ],
  };

  const api = { SOURCES, CASES, QUIZ, MAP };
  globalScope.CrrtTeachContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
/*TEACH-END*/
