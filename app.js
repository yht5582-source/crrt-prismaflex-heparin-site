"use strict";

const STORAGE_KEY = "crrt-prismaflex-heparin:v2";

const fields = {
  weightKg: document.getElementById("weightKg"),
  mode: document.getElementById("mode"),
  targetDose: document.getElementById("targetDose"),
  bloodFlow: document.getElementById("bloodFlow"),
  hours: document.getElementById("hours"),
  netUf: document.getElementById("netUf"),
  dialysateRatio: document.getElementById("dialysateRatio"),
  preRatio: document.getElementById("preRatio"),
  hematocritPercent: document.getElementById("hematocritPercent"),
  downtimePercent: document.getElementById("downtimePercent"),
  heparinBolus: document.getElementById("heparinBolus"),
  heparinInfusion: document.getElementById("heparinInfusion"),
  heparinConcentration: document.getElementById("heparinConcentration"),
};

const fieldLabels = {
  weightKg: "體重",
  targetDose: "目標劑量",
  bloodFlow: "血流量 Qb",
  hours: "預計治療時數",
  netUf: "淨脫水 Net UF",
  dialysateRatio: "CVVHDF 透析液比例",
  preRatio: "置換液 Pre 比例",
  hematocritPercent: "血比容 Hct",
};

const outputIds = [
  "postRatio",
  "outQb",
  "outEffluent",
  "outQd",
  "outQr",
  "outPre",
  "outPost",
  "outNetUf",
  "outPrescribedDose",
  "outDeliveredDose",
  "outPredilutionFactor",
  "outUptimeFactor",
  "outFiltrationFraction",
  "outHeparinPerKg",
  "outHeparinRateMl",
  "outHeparinBolusMl",
  "dayDialysate",
  "dayReplacement",
  "dayNetUf",
  "dayEffluent",
  "dayHeparin",
  "sessionDialysate",
  "sessionReplacement",
  "sessionNetUf",
  "sessionEffluent",
  "sessionHeparin",
  "sessionHoursLabel",
  "visualQb",
  "visualQd",
  "visualQr",
  "visualUf",
];

const outputs = Object.fromEntries(outputIds.map((id) => [id, document.getElementById(id)]));
const validationMessage = document.getElementById("validationMessage");
const statusPill = document.getElementById("statusPill");
const dialysateRatioField = document.getElementById("dialysateRatioField");
const preRatioField = document.getElementById("preRatioField");
const ffCard = document.getElementById("ffCard");
const copyButton = document.getElementById("copyButton");
const resetButton = document.getElementById("resetButton");
const copyStatus = document.getElementById("copyStatus");

const defaults = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));

// Blank or non-numeric input → null, so the engine can flag it instead of silently using 0.
function numberFromInput(input) {
  if (input.value.trim() === "") return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function format(value, digits) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

// Pump rates are set as whole mL/hr; doses and volumes keep one decimal.
const rate = (value) => format(Math.round(value), 0);
const dec1 = (value) => format(value, 1);
const dec2 = (value) => format(value, 2);

function readInputs() {
  return {
    weightKg: numberFromInput(fields.weightKg),
    mode: fields.mode.value,
    targetDose: numberFromInput(fields.targetDose),
    bloodFlow: numberFromInput(fields.bloodFlow),
    hours: numberFromInput(fields.hours),
    netUf: numberFromInput(fields.netUf),
    dialysateRatio: numberFromInput(fields.dialysateRatio),
    preRatio: numberFromInput(fields.preRatio),
    hematocritPercent: numberFromInput(fields.hematocritPercent),
    downtimePercent: numberFromInput(fields.downtimePercent),
    heparinBolus: numberFromInput(fields.heparinBolus),
    heparinInfusion: numberFromInput(fields.heparinInfusion),
    heparinConcentration: numberFromInput(fields.heparinConcentration),
  };
}

function warningText(warning, result) {
  const core = window.CrrtCore;
  switch (warning.code) {
    case "missing":
      return `請填寫：${warning.keys.map((key) => fieldLabels[key] || key).join("、")}${warning.keys.includes("hematocritPercent") ? "（Hct 暫以 30% 估算）" : ""}。`;
    case "weight":
      return "體重需大於 0，才能計算劑量。";
    case "ufExceedsEffluent":
      return "目標 Effluent ≤ Net UF：依原 Excel 判定為不合理，透析液/置換液以 0 顯示。請提高目標劑量或降低 Net UF。";
    case "filtrationFraction":
      return `過濾分率 ${dec1(result.filtrationFraction)}% 超過 ${core.FF_LIMIT}%，濾器易凝血。可提高 Qb、提高 Pre 比例或改由透析液 (Qd) 承擔更多劑量。`;
    case "bloodFlow":
      return `Qb ${rate(result.bloodFlow)} mL/min 不在成人常用 ${core.QB_RANGE[0]}–${core.QB_RANGE[1]} mL/min，請確認套組與醫囑。`;
    case "deliveredDose":
      return `預估送達劑量 ${dec1(result.estimatedDeliveredDose)} mL/kg/hr 不在 KDIGO 建議 20–25 mL/kg/hr，請依醫囑與院內流程確認（KDIGO 建議處方 25–30 以補償中斷）。`;
    case "hctClamped":
      return "Hct 超出 0–80%，已以邊界值計算。";
    case "heparinHigh":
      return `肝素維持 ${dec1(result.heparinPerKgHr)} U/kg/hr，高於 CRRT 常見 5–${core.HEPARIN_USUAL_MAX_U_KG_HR} U/kg/hr，請再次核對醫囑與 aPTT。`;
    case "heparinConcentration":
      return "輸入肝素針筒濃度 (U/mL) 後，才能換算 Prismaflex 針筒設定 mL/hr 與 Bolus mL。";
    default:
      return "";
  }
}

function renderMessages(result) {
  const items = result.warnings.map((warning) => ({ level: warning.level, text: warningText(warning, result) }));
  if (result.isReasonable && !items.some((item) => item.level !== "info")) {
    items.unshift({
      level: "ok",
      text: `Effluent 大於 Net UF，流量分配合理；過濾分率 ${dec1(result.filtrationFraction)}%，預估送達劑量 ${dec1(result.estimatedDeliveredDose)} mL/kg/hr 落在 20–25 常用範圍。`,
    });
  }

  validationMessage.replaceChildren(...items.map((item) => {
    const li = document.createElement("li");
    li.className = item.level;
    li.textContent = item.text;
    return li;
  }));

  const hasAlert = items.some((item) => item.level === "alert");
  const hasWarn = items.some((item) => item.level === "warn");
  statusPill.classList.toggle("alert", hasAlert);
  statusPill.classList.toggle("warn", !hasAlert && hasWarn);
  statusPill.textContent = hasAlert ? "需修正" : hasWarn ? "請確認" : "OK";
}

function writeOutputs(result) {
  outputs.postRatio.textContent = result.usesPreRatio ? dec1(result.postRatio) : "—";
  outputs.outQb.textContent = rate(result.bloodFlow);
  outputs.outEffluent.textContent = rate(result.totalEffluent);
  outputs.outQd.textContent = rate(result.qd);
  outputs.outQr.textContent = rate(result.qr);
  outputs.outPre.textContent = rate(result.qrPre);
  outputs.outPost.textContent = rate(result.qrPost);
  outputs.outNetUf.textContent = rate(result.netUf);
  outputs.outPrescribedDose.textContent = dec1(result.prescribedDose);
  outputs.outDeliveredDose.textContent = dec1(result.estimatedDeliveredDose);
  outputs.outPredilutionFactor.textContent = dec1(result.predilutionFactor * 100);
  outputs.outUptimeFactor.textContent = dec1(result.uptimeFactor * 100);
  outputs.outFiltrationFraction.textContent = dec1(result.filtrationFraction);
  outputs.outHeparinPerKg.textContent = dec1(result.heparinPerKgHr);
  outputs.outHeparinRateMl.textContent = dec2(result.heparinRateMl);
  outputs.outHeparinBolusMl.textContent = dec2(result.heparinBolusMl);

  outputs.dayDialysate.textContent = dec1(result.dayDialysate);
  outputs.dayReplacement.textContent = dec1(result.dayReplacement);
  outputs.dayNetUf.textContent = dec1(result.dayNetUf);
  outputs.dayEffluent.textContent = dec1(result.dayEffluent);
  outputs.dayHeparin.textContent = format(result.heparinDayUnits, 0);
  outputs.sessionHoursLabel.textContent = dec1(result.hours);
  outputs.sessionDialysate.textContent = dec1(result.sessionDialysate);
  outputs.sessionReplacement.textContent = dec1(result.sessionReplacement);
  outputs.sessionNetUf.textContent = dec1(result.sessionNetUf);
  outputs.sessionEffluent.textContent = dec1(result.sessionEffluent);
  outputs.sessionHeparin.textContent = format(result.heparinInfusion * result.hours + result.heparinBolus, 0);

  outputs.visualQb.textContent = rate(result.bloodFlow);
  outputs.visualQd.textContent = rate(result.qd);
  outputs.visualQr.textContent = rate(result.qr);
  outputs.visualUf.textContent = rate(result.netUf);

  fields.dialysateRatio.disabled = !result.usesDialysateRatio;
  dialysateRatioField.classList.toggle("is-disabled", !result.usesDialysateRatio);
  fields.preRatio.disabled = !result.usesPreRatio;
  preRatioField.classList.toggle("is-disabled", !result.usesPreRatio);
  ffCard.classList.toggle("alert", result.isReasonable && result.filtrationFraction > window.CrrtCore.FF_LIMIT);

  Object.entries(fields).forEach(([key, field]) => {
    field.classList.toggle("is-missing", result.missing.includes(key));
  });

  renderMessages(result);
}

function summaryText(result) {
  const lines = [
    `CRRT ${result.mode}｜體重 ${dec1(result.weightKg)} kg｜目標 ${dec1(result.targetDose)} mL/kg/hr`,
    `Qb ${rate(result.bloodFlow)} mL/min`,
    `透析液 Qd ${rate(result.qd)} mL/hr`,
    `置換液 Pre ${rate(result.qrPre)} / Post ${rate(result.qrPost)} mL/hr（Qr ${rate(result.qr)}）`,
    `Patient Removal ${rate(result.netUf)} mL/hr`,
    `Effluent ${rate(result.totalEffluent)} mL/hr｜處方 ${dec1(result.prescribedDose)}／預估送達 ${dec1(result.estimatedDeliveredDose)} mL/kg/hr｜FF ${dec1(result.filtrationFraction)}%`,
  ];
  if (result.heparinInfusion > 0 || result.heparinBolus > 0) {
    const ml = result.heparinConcentration
      ? `（${dec2(result.heparinRateMl)} mL/hr，Bolus ${dec2(result.heparinBolusMl)} mL，濃度 ${format(result.heparinConcentration, 1)} U/mL）`
      : "";
    lines.push(`肝素 Bolus ${format(result.heparinBolus, 0)} U、維持 ${format(result.heparinInfusion, 0)} U/hr = ${dec1(result.heparinPerKgHr)} U/kg/hr${ml}`);
  }
  return lines.join("\n");
}

function saveInputs() {
  try {
    const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch (error) {
    // Storage blocked (private mode); the calculator still works without it.
  }
}

function restoreInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    Object.entries(saved).forEach(([key, value]) => {
      if (fields[key] && typeof value === "string") fields[key].value = value;
    });
  } catch (error) {
    // Ignore unreadable storage.
  }
}

let lastResult = null;

function syncCalculated() {
  lastResult = window.CrrtCore.calculateCrrt(readInputs());
  writeOutputs(lastResult);
  saveInputs();
  return lastResult;
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", syncCalculated);
  field.addEventListener("change", syncCalculated);
});

copyButton.addEventListener("click", async () => {
  const text = summaryText(lastResult || syncCalculated());
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "已複製設定摘要";
  } catch (error) {
    window.prompt("複製以下設定摘要：", text);
    copyStatus.textContent = "";
  }
  setTimeout(() => { copyStatus.textContent = ""; }, 2500);
});

resetButton.addEventListener("click", () => {
  Object.entries(defaults).forEach(([key, value]) => { fields[key].value = value; });
  syncCalculated();
});

restoreInputs();
syncCalculated();
