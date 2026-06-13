"use strict";

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
  "dayDialysate",
  "dayReplacement",
  "dayNetUf",
  "dayEffluent",
  "sessionDialysate",
  "sessionReplacement",
  "sessionNetUf",
  "sessionEffluent",
  "visualQb",
  "visualQd",
  "visualQr",
  "visualUf",
];

const outputs = Object.fromEntries(outputIds.map((id) => [id, document.getElementById(id)]));
const validationMessage = document.getElementById("validationMessage");
const statusPill = document.getElementById("statusPill");
const dialysateRatioField = document.getElementById("dialysateRatioField");

function numberFromInput(input) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

function roundForMachine(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function displayNumber(value, digits = 1) {
  const rounded = roundForMachine(value);
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : Math.min(digits, 1),
  }).format(rounded);
}

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
  };
}

function writeOutputs(result) {
  outputs.postRatio.textContent = displayNumber(result.postRatio);
  outputs.outQb.textContent = displayNumber(result.bloodFlow, 0);
  outputs.outEffluent.textContent = displayNumber(result.totalEffluent);
  outputs.outQd.textContent = displayNumber(result.qd);
  outputs.outQr.textContent = displayNumber(result.qr);
  outputs.outPre.textContent = displayNumber(result.qrPre);
  outputs.outPost.textContent = displayNumber(result.qrPost);
  outputs.outNetUf.textContent = displayNumber(result.netUf);
  outputs.outPrescribedDose.textContent = displayNumber(result.prescribedDose);
  outputs.outDeliveredDose.textContent = displayNumber(result.estimatedDeliveredDose);
  outputs.outPredilutionFactor.textContent = displayNumber(result.predilutionFactor * 100);
  outputs.outUptimeFactor.textContent = displayNumber(result.uptimeFactor * 100);

  outputs.dayDialysate.textContent = displayNumber(result.dayDialysate);
  outputs.dayReplacement.textContent = displayNumber(result.dayReplacement);
  outputs.dayNetUf.textContent = displayNumber(result.dayNetUf);
  outputs.dayEffluent.textContent = displayNumber(result.dayEffluent);
  outputs.sessionDialysate.textContent = displayNumber(result.sessionDialysate);
  outputs.sessionReplacement.textContent = displayNumber(result.sessionReplacement);
  outputs.sessionNetUf.textContent = displayNumber(result.sessionNetUf);
  outputs.sessionEffluent.textContent = displayNumber(result.sessionEffluent);

  outputs.visualQb.textContent = displayNumber(result.bloodFlow, 0);
  outputs.visualQd.textContent = displayNumber(result.qd);
  outputs.visualQr.textContent = displayNumber(result.qr);
  outputs.visualUf.textContent = displayNumber(result.netUf);

  const isCvvhdf = result.mode === "CVVHDF";
  fields.dialysateRatio.disabled = !isCvvhdf;
  dialysateRatioField.style.opacity = isCvvhdf ? "1" : "0.55";

  validationMessage.classList.toggle("alert", !result.isReasonable);
  statusPill.classList.toggle("alert", !result.isReasonable);
  statusPill.textContent = result.isReasonable ? "OK" : "需檢查";

  if (!result.isReasonable) {
    validationMessage.textContent = "請檢查：Effluent ≤ Net UF，依原 Excel 狀態判定為不合理；治療液總量已以 0 顯示。";
    return;
  }

  const deliveredNote = result.isDeliveredDoseCommonRange
    ? "預估送達劑量落在 20-25 mL/kg/hr 常用範圍。"
    : "預估送達劑量不在 20-25 mL/kg/hr 常用範圍，請依醫囑與院內流程確認。";

  validationMessage.textContent = `Effluent 大於 Net UF，流量分配合理。${deliveredNote}`;
}

function syncCalculated() {
  const result = window.CrrtCore.calculateCrrt(readInputs());
  writeOutputs(result);
  return result;
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", syncCalculated);
  field.addEventListener("change", syncCalculated);
});

syncCalculated();
