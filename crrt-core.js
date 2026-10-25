"use strict";

/*ENGINE-START*/
(function attachCrrtCore(globalScope) {
  const DEFAULT_HCT = 30;
  const FF_LIMIT = 25;
  const HEPARIN_USUAL_MAX_U_KG_HR = 10;
  const QB_RANGE = [50, 450];

  function isNum(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function clampPercent(value) {
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  function clampHematocrit(value) {
    if (value < 0) return 0;
    if (value > 80) return 80;
    return value;
  }

  // Missing (null/undefined/NaN) inputs fall back to `fallback` and are reported in `missing`.
  function pick(input, key, fallback, missing) {
    const value = input[key];
    if (isNum(value)) return value;
    missing.push(key);
    return fallback;
  }

  function calculateCrrt(input) {
    const missing = [];
    const required = ["weightKg", "targetDose", "bloodFlow", "hours", "netUf"];
    const raw = {};
    required.forEach((key) => { raw[key] = pick(input, key, 0, missing); });

    const mode = ["CVVH", "CVVHD", "CVVHDF"].includes(input.mode) ? input.mode : "CVVHDF";
    const usesDialysateRatio = mode === "CVVHDF";
    const usesPreRatio = mode !== "CVVHD";

    const weightKg = Math.max(raw.weightKg, 0);
    const targetDose = Math.max(raw.targetDose, 0);
    const bloodFlow = Math.max(raw.bloodFlow, 0);
    const hours = Math.max(raw.hours, 0);
    const netUf = Math.max(raw.netUf, 0);
    const dialysateRatio = clampPercent(usesDialysateRatio ? pick(input, "dialysateRatio", 50, missing) : (input.dialysateRatio ?? 50));
    const preRatio = clampPercent(usesPreRatio ? pick(input, "preRatio", 0, missing) : (input.preRatio ?? 0));
    const hctInput = pick(input, "hematocritPercent", DEFAULT_HCT, missing);
    const hematocritPercent = clampHematocrit(hctInput);
    const downtimePercent = clampPercent(isNum(input.downtimePercent) ? input.downtimePercent : 0);

    const targetEffluent = weightKg * targetDose;
    const therapyFluid = Math.max(targetEffluent - netUf, 0);

    let qd;
    if (mode === "CVVHD") {
      qd = therapyFluid;
    } else if (mode === "CVVH") {
      qd = 0;
    } else {
      qd = therapyFluid * dialysateRatio / 100;
    }

    const qr = mode === "CVVHD" ? 0 : therapyFluid - qd;
    const qrPre = qr * preRatio / 100;
    const qrPost = qr - qrPre;
    const totalEffluent = qd + qr + netUf;
    const prescribedDose = weightKg > 0 ? totalEffluent / weightKg : 0;

    // Plasma flow (Qb × (1 − Hct)), the denominator KDIGO uses for the predilution correction.
    const plasmaFlow = bloodFlow * 60 * (1 - hematocritPercent / 100);
    const predilutionFactor = qrPre > 0
      ? (plasmaFlow > 0 ? plasmaFlow / (plasmaFlow + qrPre) : 0)
      : 1;
    const uptimeFactor = 1 - downtimePercent / 100;
    const estimatedDeliveredEffluent = totalEffluent * predilutionFactor * uptimeFactor;
    const estimatedDeliveredDose = weightKg > 0 ? estimatedDeliveredEffluent / weightKg : 0;

    // Filtration fraction: all fluid ultrafiltered across the membrane over plasma flow entering the filter.
    const ultrafiltrate = qr + netUf;
    const filterPlasmaFlow = plasmaFlow + qrPre;
    const filtrationFraction = filterPlasmaFlow > 0 ? ultrafiltrate / filterPlasmaFlow * 100 : 0;

    const heparinBolus = Math.max(isNum(input.heparinBolus) ? input.heparinBolus : 0, 0);
    const heparinInfusion = Math.max(isNum(input.heparinInfusion) ? input.heparinInfusion : 0, 0);
    const heparinConc = isNum(input.heparinConcentration) && input.heparinConcentration > 0 ? input.heparinConcentration : null;
    const heparinPerKgHr = weightKg > 0 ? heparinInfusion / weightKg : 0;
    const heparinBolusPerKg = weightKg > 0 ? heparinBolus / weightKg : 0;
    const heparinRateMl = heparinConc ? heparinInfusion / heparinConc : null;
    const heparinBolusMl = heparinConc ? heparinBolus / heparinConc : null;
    const heparinDayUnits = heparinInfusion * 24;

    const isReasonable = missing.filter((key) => required.includes(key)).length === 0
      && weightKg > 0 && targetEffluent - netUf > 0;
    const isDeliveredDoseCommonRange = estimatedDeliveredDose >= 20 && estimatedDeliveredDose <= 25;

    const warnings = [];
    if (missing.length) warnings.push({ level: "alert", code: "missing", keys: missing.slice() });
    if (weightKg <= 0 && !missing.includes("weightKg")) warnings.push({ level: "alert", code: "weight" });
    if (weightKg > 0 && !missing.includes("weightKg") && targetEffluent - netUf <= 0) warnings.push({ level: "alert", code: "ufExceedsEffluent" });
    if (isReasonable && filtrationFraction > FF_LIMIT) warnings.push({ level: "alert", code: "filtrationFraction" });
    if (isReasonable && (bloodFlow < QB_RANGE[0] || bloodFlow > QB_RANGE[1])) warnings.push({ level: "warn", code: "bloodFlow" });
    if (isReasonable && !isDeliveredDoseCommonRange) warnings.push({ level: "warn", code: "deliveredDose" });
    if (hctInput !== hematocritPercent) warnings.push({ level: "warn", code: "hctClamped" });
    if (heparinPerKgHr > HEPARIN_USUAL_MAX_U_KG_HR) warnings.push({ level: "warn", code: "heparinHigh" });
    if ((heparinInfusion > 0 || heparinBolus > 0) && !heparinConc) warnings.push({ level: "info", code: "heparinConcentration" });

    return {
      mode,
      usesDialysateRatio,
      usesPreRatio,
      weightKg,
      targetDose,
      bloodFlow,
      hours,
      netUf,
      dialysateRatio,
      preRatio,
      postRatio: 100 - preRatio,
      hematocritPercent,
      downtimePercent,
      targetEffluent,
      therapyFluid,
      qd,
      qr,
      qrPre,
      qrPost,
      totalEffluent,
      prescribedDose,
      actualDose: prescribedDose,
      plasmaFlow,
      bloodWaterFlow: plasmaFlow,
      predilutionFactor,
      uptimeFactor,
      estimatedDeliveredEffluent,
      estimatedDeliveredDose,
      ultrafiltrate,
      filtrationFraction,
      dayDialysate: qd * 24 / 1000,
      dayReplacement: qr * 24 / 1000,
      dayNetUf: netUf * 24 / 1000,
      dayEffluent: totalEffluent * 24 / 1000,
      sessionDialysate: qd * hours / 1000,
      sessionReplacement: qr * hours / 1000,
      sessionNetUf: netUf * hours / 1000,
      sessionEffluent: totalEffluent * hours / 1000,
      heparinBolus,
      heparinInfusion,
      heparinConcentration: heparinConc,
      heparinPerKgHr,
      heparinBolusPerKg,
      heparinRateMl,
      heparinBolusMl,
      heparinDayUnits,
      missing,
      warnings,
      isReasonable,
      isDeliveredDoseCommonRange,
    };
  }

  const api = { calculateCrrt, clampPercent, clampHematocrit, FF_LIMIT, HEPARIN_USUAL_MAX_U_KG_HR, QB_RANGE };

  globalScope.CrrtCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
/*ENGINE-END*/
