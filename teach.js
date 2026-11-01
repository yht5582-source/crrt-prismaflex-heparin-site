"use strict";

(function initCrrtTeach() {
  const { SOURCES, CASES, QUIZ, MAP } = window.CrrtTeachContent;
  const core = window.CrrtCore;
  const FIELD_IDS = ["weightKg", "mode", "targetDose", "bloodFlow", "hours", "netUf", "dialysateRatio", "preRatio",
    "hematocritPercent", "downtimePercent", "heparinBolus", "heparinInfusion", "heparinConcentration"];
  const VIEWS = ["tool", "cases", "quiz", "map"];

  const banner = document.getElementById("demoBanner");
  const bannerText = document.getElementById("demoBannerText");
  let snapshot = null;

  function esc(text) {
    return String(text).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  function sourceLinks(keys) {
    return (keys || []).map((key) => `<a href="${SOURCES[key].href}" target="_blank" rel="noopener">${esc(SOURCES[key].label)}</a>`).join("、");
  }

  /* ---------- views ---------- */
  function showView(name, scroll) {
    const view = VIEWS.includes(name) ? name : "tool";
    VIEWS.forEach((key) => { document.getElementById(`view-${key}`).hidden = key !== view; });
    document.querySelectorAll(".tabs a").forEach((link) => {
      if (link.dataset.view === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelector(".topbar-actions").hidden = view !== "tool";
    if (scroll) window.scrollTo(0, 0);
  }

  function route(scroll) {
    showView(location.hash.replace("#", ""), scroll);
  }

  /* ---------- demo cases into the calculator ---------- */
  function setFields(values) {
    FIELD_IDS.forEach((id) => {
      const value = values[id];
      document.getElementById(id).value = value === null || value === undefined ? "" : String(value);
    });
    document.getElementById("weightKg").dispatchEvent(new Event("input", { bubbles: true }));
  }

  // The fictional values must never replace what the user saved (see saveInputs in app.js).
  function loadCase(caseItem, scenario) {
    if (!snapshot) snapshot = Object.fromEntries(FIELD_IDS.map((id) => [id, document.getElementById(id).value]));
    window.crrtDemo = { label: `${caseItem.title}｜${scenario.label}` };
    setFields(scenario.input);
    bannerText.textContent = `示範病例（虛構，非實際病人）：${caseItem.title}｜${scenario.label}。`;
    banner.hidden = false;
    location.hash = "#tool";
  }

  function leaveDemo() {
    window.crrtDemo = null;
    banner.hidden = true;
  }

  document.getElementById("demoRestore").addEventListener("click", () => {
    const values = snapshot;
    snapshot = null;
    leaveDemo();
    if (values) setFields(values);
  });

  // Capture so the demo is cleared before app.js handles the reset and saves the defaults.
  document.addEventListener("click", (event) => {
    if (event.target.id === "resetButton") { snapshot = null; leaveDemo(); }
  }, true);

  /* ---------- cases ---------- */
  const ROWS = [
    { label: "模式", get: (r) => r.mode },
    { label: "Qb（mL/min）", get: (r) => fmt(r.bloodFlow, 0) },
    { label: "Effluent（mL/hr）", get: (r) => fmt(r.totalEffluent, 0) },
    { label: "透析液 Qd（mL/hr）", get: (r) => fmt(r.qd, 0) },
    { label: "置換液 Pre / Post（mL/hr）", get: (r) => `${fmt(r.qrPre, 0)} / ${fmt(r.qrPost, 0)}` },
    { label: "Net UF（mL/hr）", get: (r) => fmt(r.netUf, 0) },
    { label: "處方劑量（mL/kg/hr）", get: (r) => fmt(r.prescribedDose, 1) },
    { label: "預估送達（mL/kg/hr）", get: (r) => fmt(r.estimatedDeliveredDose, 1), flag: (r) => !r.isDeliveredDoseCommonRange },
    { label: "過濾分率 FF（%）", get: (r) => fmt(r.filtrationFraction, 1), flag: (r) => r.filtrationFraction > core.FF_LIMIT },
    { label: "肝素（U/kg/hr）", get: (r) => fmt(r.heparinPerKgHr, 1), flag: (r) => r.heparinPerKgHr > core.HEPARIN_USUAL_MAX_U_KG_HR },
    { label: "肝素針筒（mL/hr）", get: (r) => (r.heparinRateMl === null ? "—" : fmt(r.heparinRateMl, 1)) },
  ];

  function fmt(value, digits) {
    return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(value);
  }

  function caseCard(caseItem, index) {
    const results = caseItem.scenarios.map((s) => core.calculateCrrt(s.input));
    const head = caseItem.scenarios.map((s) => `<th scope="col">${esc(s.label)}</th>`).join("");
    const body = ROWS.map((row) => `<tr><th scope="row">${esc(row.label)}</th>${results.map((r) => {
      const flagged = row.flag && row.flag(r);
      return `<td${flagged ? ' class="flag"' : ""}>${esc(row.get(r))}${flagged ? ' <span class="flag-mark">範圍外</span>' : ""}</td>`;
    }).join("")}</tr>`).join("");
    const buttons = caseItem.scenarios.map((s, i) => `<button type="button" class="load-case" data-case="${index}" data-scenario="${i}">帶入工具：${esc(s.label)}</button>`).join("");
    return `<article class="panel case-card" id="${caseItem.id}">
      <header class="case-head">
        <span class="case-no">病例 ${index + 1}</span>
        <h3>${esc(caseItem.title)}</h3>
        <p class="tag-row">${caseItem.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</p>
      </header>
      <p class="case-story">${esc(caseItem.story)}</p>
      <p class="case-ask"><b>想一想：</b>${esc(caseItem.ask)}</p>
      <div class="table-wrap"><table class="case-table"><thead><tr><th scope="col">項目</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="case-actions">${buttons}</div>
      <details class="case-answer"><summary>看判讀與處理</summary>
        <ul>${caseItem.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        <p class="trap"><b>陷阱：</b>${esc(caseItem.trap)}</p>
        <p class="src">依據：${sourceLinks(caseItem.sources)}</p>
      </details>
    </article>`;
  }

  function renderCases() {
    const root = document.getElementById("caseList");
    root.innerHTML = CASES.map(caseCard).join("");
    root.addEventListener("click", (event) => {
      const button = event.target.closest(".load-case");
      if (!button) return;
      const caseItem = CASES[Number(button.dataset.case)];
      loadCase(caseItem, caseItem.scenarios[Number(button.dataset.scenario)]);
    });
  }

  /* ---------- quiz ---------- */
  const LETTERS = ["A", "B", "C", "D"];
  let picks = [];

  function renderQuiz() {
    picks = QUIZ.map(() => null);
    const root = document.getElementById("quizList");
    let lastLevel = "";
    root.innerHTML = QUIZ.map((item, index) => {
      const heading = item.level !== lastLevel ? `<h3 class="quiz-level">${esc(item.level)}題</h3>` : "";
      lastLevel = item.level;
      return `${heading}<fieldset class="quiz-item" data-q="${index}">
        <legend><span class="q-no">${index + 1}</span>${esc(item.q)}</legend>
        <div class="q-options">${item.options.map((option, i) => `<button type="button" class="q-option" data-letter="${LETTERS[i]}"><b>${LETTERS[i]}</b><span>${esc(option)}</span></button>`).join("")}</div>
        <div class="q-why" hidden></div>
      </fieldset>`;
    }).join("");
    updateScore();
  }

  function updateScore() {
    const done = picks.filter(Boolean).length;
    const right = picks.filter((pick, i) => pick === QUIZ[i].answer).length;
    document.getElementById("quizScore").textContent = done === QUIZ.length
      ? `完成：答對 ${right} / ${QUIZ.length} 題`
      : `已作答 ${done} / ${QUIZ.length} 題，答對 ${right} 題`;
  }

  document.getElementById("quizList").addEventListener("click", (event) => {
    const button = event.target.closest(".q-option");
    if (!button) return;
    const box = button.closest(".quiz-item");
    const index = Number(box.dataset.q);
    if (picks[index]) return;
    const item = QUIZ[index];
    picks[index] = button.dataset.letter;
    box.querySelectorAll(".q-option").forEach((option) => {
      option.disabled = true;
      if (option.dataset.letter === item.answer) option.classList.add("right");
      else if (option === button) option.classList.add("wrong");
    });
    const why = box.querySelector(".q-why");
    const correct = picks[index] === item.answer;
    const src = item.sources.length ? `<p class="src">依據：${sourceLinks(item.sources)}</p>` : "";
    why.innerHTML = `<p><b class="${correct ? "ok-text" : "bad-text"}">${correct ? "答對" : `答錯，正解 ${item.answer}`}。</b>${esc(item.why)}</p>${src}`;
    why.hidden = false;
    updateScore();
  });

  document.getElementById("quizReset").addEventListener("click", () => {
    renderQuiz();
    window.scrollTo(0, 0);
  });

  /* ---------- mind map ---------- */
  function renderMap() {
    document.getElementById("mindMap").innerHTML = `<div class="mm-root">${esc(MAP.root)}</div>
      <ul class="mm-branches">${MAP.branches.map((branch) => `<li class="mm-branch tone-${branch.tone}">
        <div class="mm-node">${esc(branch.title)}</div>
        <ul class="mm-leaves">${branch.leaves.map((leaf) => `<li><span>${esc(leaf.t)}</span>${leaf.s ? `<small>${esc(leaf.s)}</small>` : ""}</li>`).join("")}</ul>
      </li>`).join("")}</ul>`;
  }

  function renderSources() {
    document.getElementById("teachSources").innerHTML = Object.values(SOURCES).map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener">${esc(s.text)}</a></li>`).join("");
  }

  renderCases();
  renderQuiz();
  renderMap();
  renderSources();
  window.addEventListener("hashchange", () => route(true));
  route(false);
})();
