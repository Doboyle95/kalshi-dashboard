---
title: Ask Data
---

<div class="page-hero">
  <div class="page-eyebrow">Local LLM</div>
  <h1>Ask the Kalshi Data</h1>
  <p class="page-lead">Ask natural-language questions against the local DuckDB layer. The dashboard sends the question to a local FastAPI server, which generates SQL with your configured LLM provider and runs it against your Parquet and CSV files.</p>
  <div class="page-meta">Requires <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>, plus the local API server.</div>
</div>

<p class="section-intro">This page is local-only. Your API key and the full dataset stay on your machine; the browser only talks to <code>http://127.0.0.1:8000</code>.</p>

<details class="surface-card compact-details">
  <summary>How the local chat works</summary>
  <p>The page sends your question to the local FastAPI server at <code>http://127.0.0.1:8000</code>. The server asks the configured LLM to generate read-only SQL, validates it, runs it against local DuckDB views over Parquet and CSV data, and returns SQL, rows, and interpretation. The full dataset stays on your machine; only the question plus schema context go to the configured LLM provider.</p>
</details>

<details class="surface-card compact-details">
  <summary>How to get better answers</summary>
  <p>Ask for a metric, population, and date window in the same sentence, for example "sports vs non-sports fees in February 2026." Use follow-ups for interpretation after the first query succeeds; the SQL and evidence panels are there to help sanity-check what the model actually used.</p>
</details>

```js
{
  const { marked } = await import("npm:marked");
  marked.setOptions({mangle: false, headerIds: false});

  const apiUrl = "http://127.0.0.1:8000/ask";
  const resetUrl = "http://127.0.0.1:8000/reset";
  const healthUrl = "http://127.0.0.1:8000/health";
  const apiCommand = "cd KalshiData/python && python -m uvicorn api:app --port 8000";
  const HISTORY_KEY = "kalshi_chat_history";
  const HISTORY_MAX = 10;
  const EXAMPLES = [
    "Top 5 categories by contracts in March 2026",
    "Daily fees for sports vs non-sports in February 2026",
    "Which report tickers had the most contracts on 2026-02-08?",
    "Taker yes vs no volume since 2026-01-25"
  ];

  function sanitizeMarkdown(markdown, inline = false) {
    const raw = inline ? marked.parseInline(markdown ?? "") : marked.parse(markdown ?? "");
    const template = document.createElement("template");
    template.innerHTML = raw;
    const allowedTags = new Set(["P", "BR", "STRONG", "EM", "UL", "OL", "LI", "CODE", "A"]);
    const allowedAttrs = new Map([["A", new Set(["href"])]]);

    function clean(node) {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) continue;
        if (child.nodeType !== 1 || !allowedTags.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent ?? ""));
          continue;
        }
        for (const attr of Array.from(child.attributes)) {
          const attrAllowed = allowedAttrs.get(child.tagName)?.has(attr.name);
          if (!attrAllowed) child.removeAttribute(attr.name);
        }
        if (child.tagName === "A") {
          const href = child.getAttribute("href") ?? "";
          if (!/^https?:\/\//i.test(href)) child.removeAttribute("href");
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
        clean(child);
      }
    }

    clean(template.content);
    return template.innerHTML;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  }

  function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch {}
  }

  function pushHistory(question, data) {
    const history = loadHistory();
    history.unshift({ question, data, ts: Date.now() });
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    saveHistory(history);
  }

  const panel = html`<div class="chat-panel"></div>`;
  const statusSection = html`<div class="chat-status-strip">
    <span class="chat-status-dot is-loading"></span>
    <span>Checking local API...</span>
  </div>`;
  const historySection = html`<div class="chat-history-section"></div>`;
  const examples = html`<details class="chat-examples">
    <summary class="chat-examples-label">Example questions</summary>
    <div class="chat-example-chips"></div>
  </details>`;
  const formWrapper = html`<details class="chat-reply-wrapper" open>
    <summary class="chat-reply-summary">Ask a question</summary>
    <form class="chat-form">
      <textarea id="chat-question" class="chat-question" rows="3" placeholder="What was the total volume on February 8, 2026?"></textarea>
      <div class="chat-actions">
        <button type="submit" class="ui-button">Ask</button>
        <button type="button" class="ui-button is-subtle">Clear</button>
        <button type="button" class="ui-button is-subtle chat-new-conv">New conversation</button>
        <button type="button" class="ui-button is-subtle chat-clear-history">Clear history</button>
      </div>
    </form>
  </details>`;
  const form = formWrapper.querySelector("form");
  const replyLabel = formWrapper.querySelector(".chat-reply-summary");
  const thread = html`<div class="chat-thread"></div>`;

  const textarea = form.querySelector("textarea");
  const [submitButton, clearButton, newConvButton, clearHistoryButton] = form.querySelectorAll("button");
  const chips = examples.querySelector(".chat-example-chips");

  for (const example of EXAMPLES) {
    const chip = html`<button type="button" class="chat-example-chip"></button>`;
    chip.textContent = example;
    chip.addEventListener("click", () => {
      textarea.value = example;
      runQuestion(example);
    });
    chips.append(chip);
  }

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    newConvButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Asking..." : "Ask";
  }

  function appendTurnError(pendingTurn, message) {
    const error = html`<div class="chart-note chat-error"><strong>Query issue:</strong> <span></span></div>`;
    error.querySelector("span").textContent = message;
    pendingTurn.querySelector(".chat-turn-answer").replaceChildren(error);
    pendingTurn.classList.remove("is-pending");
  }

  function statusText(data) {
    if (!data?.ok) return "Local API unavailable";
    const provider = data.provider ? data.provider[0].toUpperCase() + data.provider.slice(1) : "LLM";
    const raw = data.raw_trades_through ? `Raw trades through ${data.raw_trades_through}` : "Raw trades loaded";
    const aggregate = data.aggregate_through && data.aggregate_through !== data.raw_trades_through
      ? `aggregates through ${data.aggregate_through}`
      : null;
    const rows = data.trade_rows ? `${Number(data.trade_rows).toLocaleString()} rows` : null;
    return [provider, data.model, raw, aggregate, rows].filter(Boolean).join(" | ");
  }

  async function refreshStatus() {
    try {
      const response = await fetch(healthUrl);
      const data = await response.json();
      statusSection.replaceChildren(
        html`<span class="chat-status-dot ${data.ok ? "is-ok" : "is-error"}"></span>`,
        html`<span>${statusText(data)}</span>`
      );
    } catch {
      statusSection.replaceChildren(
        html`<span class="chat-status-dot is-error"></span>`,
        html`<span>Local API offline. Start it first: ${apiCommand}</span>`
      );
    }
  }

  function buildResultFragment(data) {
    const frag = document.createDocumentFragment();

    if (data.error) {
      const error = html`<div class="chart-note chat-error"><strong>Query issue:</strong> <span></span></div>`;
      error.querySelector("span").textContent = data.error;
      frag.append(error);
      return frag;
    }

    if (data.clarify) {
      const box = html`<div class="surface-card chat-clarify"><strong>Could you clarify?</strong><p></p></div>`;
      box.querySelector("p").textContent = data.clarify;
      frag.append(box);
      return frag;
    }

    if (data.unsupported) {
      const box = html`<div class="surface-card chat-unsupported"><strong>This question can't be answered from the available data</strong><p></p></div>`;
      box.querySelector("p").textContent = data.unsupported;
      frag.append(box);
      return frag;
    }

    if (data.sql_summary) {
      const summaryEl = html`<p class="chat-sql-summary"></p>`;
      summaryEl.innerHTML = sanitizeMarkdown(data.sql_summary, true);
      frag.append(summaryEl);
    }

    if (data.query_contract) {
      const contract = data.query_contract;
      const details = html`<details class="surface-card compact-details chat-query-contract">
        <summary>Query plan</summary>
        <div class="chat-contract-grid"></div>
      </details>`;
      const grid = details.querySelector(".chat-contract-grid");
      const rows = [
        ["Metric", contract.metric],
        ["Date range", contract.date_range],
        ["Grouping", contract.grouping?.join(", ")],
        ["Filters", contract.filters?.join(", ")],
        ["Preferred source", contract.preferred_source],
        ["Assumptions", contract.assumptions?.join("; ")],
        ["Ambiguities", contract.ambiguities?.join("; ")],
        ["Confidence", contract.confidence]
      ].filter(([, value]) => value != null && String(value).trim() !== "");
      for (const [label, value] of rows) {
        const labelEl = html`<div class="chat-contract-label"></div>`;
        const valueEl = html`<div class="chat-contract-value"></div>`;
        labelEl.textContent = label;
        valueEl.textContent = value;
        grid.append(labelEl, valueEl);
      }
      frag.append(details);
    }

    if (data.sql) {
      const label = data.sql_cached ? "SQL (cached)" : "Generated SQL";
      const details = html`<details class="surface-card compact-details chat-sql">
        <summary></summary>
        <pre><code></code></pre>
      </details>`;
      details.querySelector("summary").textContent = label;
      details.querySelector("code").textContent = data.sql;
      frag.append(details);
    }

    if (data.interpretation) {
      const readMoreIdx = data.interpretation.indexOf("Read more:");
      const narrative = readMoreIdx >= 0 ? data.interpretation.slice(0, readMoreIdx).trim() : data.interpretation.trim();
      const readMore = readMoreIdx >= 0 ? data.interpretation.slice(readMoreIdx).trim() : null;
      const interpWrap = html`<div class="chat-interpretation"></div>`;
      const narrativeEl = html`<div class="chat-interpretation-text"></div>`;
      narrativeEl.innerHTML = sanitizeMarkdown(narrative);
      interpWrap.append(narrativeEl);
      if (readMore) {
        const readMoreEl = html`<p class="chat-read-more"></p>`;
        readMoreEl.innerHTML = sanitizeMarkdown(readMore, true);
        interpWrap.append(readMoreEl);
      }
      frag.append(interpWrap);
    }

    if (data.note) {
      frag.append(html`<div class="chart-note">${data.note}</div>`);
    }

    if (data.rows?.length) {
      frag.append(Inputs.table(data.rows, {
        columns: data.columns,
        rows: Math.min(25, data.rows.length),
        layout: "auto"
      }));
    } else {
      frag.append(html`<div class="chart-note">The query ran successfully but returned no rows.</div>`);
      if (data.suggestion) {
        const suggestEl = html`<div class="surface-card chat-suggestion"><strong>Suggestion:</strong><p></p></div>`;
        suggestEl.querySelector("p").textContent = data.suggestion;
        frag.append(suggestEl);
      }
    }

    const meta = [
      data.sql_cached ? "SQL cached" : null,
      data.source_tables?.length ? `Source: ${data.source_tables.join(", ")}` : null,
      data.row_count != null ? `${Number(data.row_count).toLocaleString()} rows shown` : null,
      data.query_ms != null ? `DuckDB ${(Number(data.query_ms) / 1000).toFixed(2)}s` : null,
      data.elapsed_ms != null ? `Total ${(Number(data.elapsed_ms) / 1000).toFixed(2)}s` : null,
      data.result_truncated ? "Truncated" : null
    ].filter(Boolean);
    if (meta.length) {
      const metaEl = html`<div class="chat-query-meta"></div>`;
      metaEl.textContent = meta.join(" | ");
      frag.append(metaEl);
    }

    return frag;
  }

  function renderHistory() {
    const history = loadHistory();
    historySection.replaceChildren();
    if (!history.length) return;

    const wrapper = html`<details class="chat-history-wrapper">
      <summary class="chat-history-heading">Recent questions (${history.length})</summary>
    </details>`;

    for (const entry of history) {
      const item = html`<details class="surface-card compact-details chat-history-item"><summary></summary></details>`;
      item.querySelector("summary").textContent = entry.question;
      item.append(buildResultFragment(entry.data));
      wrapper.append(item);
    }

    historySection.append(wrapper);
  }

  async function runQuestion(rawQuestion) {
    const question = rawQuestion.trim();
    if (!question) return;

    setBusy(true);

    // Create a pending turn card and append it to the thread immediately
    const pendingTurn = html`<div class="chat-turn is-pending">
      <div class="chat-turn-question"></div>
      <div class="chat-turn-answer"><div class="chart-note">Asking the local API...</div></div>
    </div>`;
    pendingTurn.querySelector(".chat-turn-question").textContent = question;
    thread.append(pendingTurn);
    pendingTurn.scrollIntoView({behavior: "smooth", block: "nearest"});

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({question})
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json();

      // Populate the answer area with the real result
      const answerEl = pendingTurn.querySelector(".chat-turn-answer");
      answerEl.replaceChildren(buildResultFragment(data));
      pendingTurn.classList.remove("is-pending");

      textarea.value = "";
      formWrapper.removeAttribute("open");
      replyLabel.textContent = "Reply";

      pushHistory(question, data);
      renderHistory();
      refreshStatus();

      if (data.rows?.length && !data.error && !data.clarify && !data.unsupported) {
        const insightsBtn = html`<button class="ui-button chat-insights-btn">Deeper insights</button>`;
        insightsBtn.addEventListener("click", async () => {
          insightsBtn.disabled = true;
          insightsBtn.textContent = "Running deeper analysis...";
          const pending = html`<div class="chart-note chat-insights-pending">Running deeper analysis with the primary model. This can take 20-60 seconds for context queries.</div>`;
          insightsBtn.after(pending);
          try {
            const insResp = await fetch(`${apiUrl.replace("/ask", "/insights")}`, {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({question, sql: data.sql, rows: data.rows, columns: data.columns})
            });
            if (!insResp.ok) throw new Error(`HTTP ${insResp.status}`);
            const ins = await insResp.json();
            if (ins.error) throw new Error(ins.error);
            const insightEl = html`<div class="chat-deep-insights"></div>`;
            insightEl.innerHTML = sanitizeMarkdown(ins.insights);
            if (ins.elapsed_ms != null) {
              const meta = html`<div class="chat-query-meta"></div>`;
              meta.textContent = `Insights ${(Number(ins.elapsed_ms) / 1000).toFixed(2)}s`;
              insightEl.append(meta);
            }
            const replacements = [insightEl];

            if (ins.evidence?.length) {
              const evidenceDetails = html`<details class="surface-card compact-details chat-evidence">
                <summary>Evidence used (${ins.evidence.length})</summary>
              </details>`;
              for (const ev of ins.evidence) {
                const evEl = html`<div class="chat-evidence-item">
                  <div class="chat-evidence-header">
                    <span class="chat-evidence-label"></span>
                    <span class="chat-evidence-badge ${ev.source === 'deterministic' ? 'is-deterministic' : 'is-llm'}"></span>
                  </div>
                  <p class="chat-evidence-summary"></p>
                </div>`;
                evEl.querySelector(".chat-evidence-label").textContent = ev.label;
                evEl.querySelector(".chat-evidence-badge").textContent = ev.source === "deterministic" ? "Data" : "AI context";
                evEl.querySelector(".chat-evidence-summary").textContent = ev.summary;
                evidenceDetails.append(evEl);
              }
              replacements.push(evidenceDetails);
            }

            if (ins.context_sql?.length) {
              const ctxDetails = html`<details class="surface-card compact-details chat-context-sql">
                <summary>Context queries (${ins.context_sql.length})</summary>
              </details>`;
              for (const s of ins.context_sql) {
                const pre = html`<pre><code></code></pre>`;
                pre.querySelector("code").textContent = s;
                ctxDetails.append(pre);
              }
              replacements.push(ctxDetails);
            }

            pending.remove();
            insightsBtn.replaceWith(...replacements);
          } catch (e) {
            pending.remove();
            const errEl = html`<div class="chart-note chat-error"><strong>Query issue:</strong> <span></span></div>`;
            errEl.querySelector("span").textContent = `Could not generate deeper insights: ${e.message ?? e}`;
            insightsBtn.replaceWith(errEl);
          }
        });
        answerEl.append(insightsBtn);
      }
    } catch (error) {
      const msg = String(error?.message ?? "").startsWith("API returned HTTP")
        ? `${error.message}. Check the local API logs.`
        : `Local API unreachable. Start it first: ${apiCommand}`;
      appendTurnError(pendingTurn, msg);
      formWrapper.removeAttribute("open");
      replyLabel.textContent = "Reply";
    } finally {
      setBusy(false);
    }
  }

  clearButton.addEventListener("click", () => {
    textarea.value = "";
    textarea.focus();
  });

  newConvButton.addEventListener("click", async () => {
    try { await fetch(resetUrl, {method: "POST"}); } catch {}
    thread.replaceChildren();
    textarea.value = "";
    formWrapper.setAttribute("open", "");
    replyLabel.textContent = "Ask a question";
    textarea.focus();
  });

  clearHistoryButton.addEventListener("click", () => {
    saveHistory([]);
    renderHistory();
  });

  form.addEventListener("input", event => {
    event.stopPropagation();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    event.stopPropagation();
    await runQuestion(textarea.value);
  });

  textarea.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      runQuestion(textarea.value);
    }
  });

  renderHistory();
  refreshStatus();
  panel.append(statusSection, historySection, examples, thread, formWrapper);
  display(panel);
}
```

<div class="chart-note"><strong>Tip:</strong> Summary questions (total volume, top categories, daily fees) use pre-aggregated tables and return quickly. Trade-level questions, such as individual trade sizes, price distributions, or taker-side breakdowns, scan raw Parquet files and may take 10-30 seconds depending on the date range.</div>
