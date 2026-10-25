"use strict";
const assert = require("assert");
const { calculateCrrt } = require("./crrt-core.js");

let n = 0;
function t(name, fn) { fn(); n += 1; console.log("ok", n, name); }
const near = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const base = { weightKg: 60, mode: "CVVHDF", targetDose: 25, bloodFlow: 180, hours: 24, netUf: 100,
  dialysateRatio: 50, preRatio: 70, hematocritPercent: 30, downtimePercent: 0, heparinBolus: 0, heparinInfusion: 0 };
const codes = (r) => r.warnings.map((w) => w.code);

t("default CVVHDF matches Excel split", () => {
  const r = calculateCrrt(base);
  assert.strictEqual(r.qd, 700); assert.strictEqual(r.qr, 700);
  near(r.qrPre, 490); near(r.qrPost, 210); assert.strictEqual(r.totalEffluent, 1500);
  near(r.prescribedDose, 25); near(r.estimatedDeliveredDose, 23.5);
  near(r.filtrationFraction, 800 / 8050 * 100);
  assert.ok(r.isReasonable); assert.deepStrictEqual(codes(r), []);
});
t("CVVH: all therapy fluid is replacement", () => {
  const r = calculateCrrt({ ...base, mode: "CVVH" });
  assert.strictEqual(r.qd, 0); assert.strictEqual(r.qr, 1400); near(r.qrPre, 980);
});
t("CVVHD: no replacement, pre ratio ignored, FF = UF only", () => {
  const r = calculateCrrt({ ...base, mode: "CVVHD", preRatio: null });
  assert.strictEqual(r.qd, 1400); assert.strictEqual(r.qr, 0); assert.strictEqual(r.predilutionFactor, 1);
  assert.ok(!r.missing.includes("preRatio")); near(r.filtrationFraction, 100 / 7560 * 100);
});
t("blank weight flagged, not silently 0", () => {
  const r = calculateCrrt({ ...base, weightKg: null });
  assert.ok(r.missing.includes("weightKg")); assert.ok(!r.isReasonable); assert.ok(codes(r).includes("missing"));
});
t("blank Hct uses 30% fallback and is flagged", () => {
  const r = calculateCrrt({ ...base, hematocritPercent: null });
  assert.strictEqual(r.hematocritPercent, 30); assert.ok(r.missing.includes("hematocritPercent"));
});
t("Net UF ≥ target effluent is unreasonable", () => {
  const r = calculateCrrt({ ...base, netUf: 1500 });
  assert.strictEqual(r.therapyFluid, 0); assert.ok(!r.isReasonable); assert.ok(codes(r).includes("ufExceedsEffluent"));
});
t("high FF in post-dilution CVVH flagged", () => {
  const r = calculateCrrt({ ...base, mode: "CVVH", preRatio: 0, bloodFlow: 100, targetDose: 35 });
  assert.ok(r.filtrationFraction > 25); assert.ok(codes(r).includes("filtrationFraction"));
});
t("downtime lowers delivered dose and warns", () => {
  const r = calculateCrrt({ ...base, downtimePercent: 20 });
  near(r.estimatedDeliveredDose, 23.5 * 0.8, 0.1); assert.ok(codes(r).includes("deliveredDose"));
});
t("heparin conversions", () => {
  const r = calculateCrrt({ ...base, heparinBolus: 2000, heparinInfusion: 500, heparinConcentration: 100 });
  near(r.heparinPerKgHr, 8.33, 0.01); near(r.heparinRateMl, 5); near(r.heparinBolusMl, 20);
  assert.strictEqual(r.heparinDayUnits, 12000); assert.ok(!codes(r).includes("heparinHigh"));
});
t("heparin without concentration → info, high dose → warn", () => {
  const r = calculateCrrt({ ...base, heparinInfusion: 900 });
  assert.strictEqual(r.heparinRateMl, null);
  assert.ok(codes(r).includes("heparinConcentration")); assert.ok(codes(r).includes("heparinHigh"));
});
t("Qb outside range warns", () => {
  assert.ok(codes(calculateCrrt({ ...base, bloodFlow: 40 })).includes("bloodFlow"));
});
t("Hct > 80 clamped and warned", () => {
  const r = calculateCrrt({ ...base, hematocritPercent: 90 });
  assert.strictEqual(r.hematocritPercent, 80); assert.ok(codes(r).includes("hctClamped"));
});
console.log(`${n} tests passed`);
