"use strict";

(function attachCrrtCore(globalScope) {
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

  function calculateCrrt(input) {
    const weightKg = Math.max(input.weightKg, 0);
    const targetDose = Math.max(input.targetDose, 0);
    const bloodFlow = Math.max(input.bloodFlow, 0);
    const hours = Math.max(input.hours, 0);
    const netUf = Math.max(input.netUf, 0);
    const dialysateRatio = clampPercent(input.dialysateRatio);
    const preRatio = clampPercent(input.preRatio);
    const hematocritPercent = clampHematocrit(input.hematocritPercent ?? 30);
    const downtimePercent = clampPercent(input.downtimePercent ?? 0);

    const targetEffluent = weightKg * targetDose;
    const therapyFluid = Math.max(targetEffluent - netUf, 0);

    let qd;
    if (input.mode === "CVVHD") {
      qd = therapyFluid;
    } else if (input.mode === "CVVH") {
      qd = 0;
    } else {
      qd = therapyFluid * dialysateRatio / 100;
    }

    const qr = input.mode === "CVVHD" ? 0 : therapyFluid - qd;
    const qrPre = qr * preRatio / 100;
    const qrPost = qr - qrPre;
    const totalEffluent = qd + qr + netUf;
    const prescribedDose = weightKg > 0 ? totalEffluent / weightKg : 0;
    const bloodWaterFlow = bloodFlow * 60 * (1 - hematocritPercent / 100);
    const predilutionFactor = qrPre > 0
      ? (bloodWaterFlow > 0 ? bloodWaterFlow / (bloodWaterFlow + qrPre) : 0)
      : 1;
    const uptimeFactor = 1 - downtimePercent / 100;
    const estimatedDeliveredEffluent = totalEffluent * predilutionFactor * uptimeFactor;
    const estimatedDeliveredDose = weightKg > 0 ? estimatedDeliveredEffluent / weightKg : 0;

    return {
      mode: input.mode,
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
      bloodWaterFlow,
      predilutionFactor,
      uptimeFactor,
      estimatedDeliveredEffluent,
      estimatedDeliveredDose,
      dayDialysate: qd * 24 / 1000,
      dayReplacement: qr * 24 / 1000,
      dayNetUf: netUf * 24 / 1000,
      dayEffluent: totalEffluent * 24 / 1000,
      sessionDialysate: qd * hours / 1000,
      sessionReplacement: qr * hours / 1000,
      sessionNetUf: netUf * hours / 1000,
      sessionEffluent: totalEffluent * hours / 1000,
      heparinBolus: Math.max(input.heparinBolus, 0),
      heparinInfusion: Math.max(input.heparinInfusion, 0),
      isReasonable: targetEffluent - netUf > 0,
      isDeliveredDoseCommonRange: estimatedDeliveredDose >= 20 && estimatedDeliveredDose <= 25,
    };
  }

  const api = { calculateCrrt, clampPercent, clampHematocrit };

  globalScope.CrrtCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
