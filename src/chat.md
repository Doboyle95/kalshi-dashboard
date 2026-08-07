---
title: Ask Data
---

<div class="page-hero">
  <div class="page-eyebrow">Local LLM</div>
  <h1>Ask the Kalshi Data</h1>
  <p class="page-lead">Ask natural-language questions against the local DuckDB layer. The dashboard sends the question to a local FastAPI server, which generates SQL with your configured LLM provider and runs it against your Parquet and CSV files.</p>
  <div class="page-meta">Requires <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>, plus the local API server.</div>
</div>

<p class="section-intro">Ask questions in plain English against the underlying trade data. The dataset itself never leaves the server — what goes to the LLM provider is your question, a description of the schema, and a sample of the rows your query returns.</p>

<details class="surface-card compact-details">
  <summary>How this works</summary>
  <p>Your question goes to a FastAPI server, which asks the configured LLM to generate read-only SQL, validates that SQL against a table allowlist and a set of syntax and I/O restrictions, runs it against DuckDB views over Parquet and CSV data, and returns the SQL, the rows, and an interpretation.</p>
  <p>The dataset stays on the server. What is sent to the LLM provider is: your question, the schema description, and — so the model can interpret results rather than just emit SQL — up to the first 10 rows returned. “Deeper insights” sends up to 20 rows, plus a similar sample from each supporting query it runs. If retrieval-augmented context is enabled, your question is additionally sent to OpenAI’s embeddings endpoint, regardless of which provider generates the SQL.</p>
  <p>Ask for a metric, population, and date window in the same sentence, for example "sports vs non-sports fees in February 2026." Use follow-ups for interpretation after the first query succeeds; the SQL and evidence panels are there to help sanity-check what the model actually used.</p>
</details>

```js
{
  const { marked } = await import("npm:marked");
  marked.setOptions({mangle: false, headerIds: false});

  // NOTE: this js block runs in the BROWSER (Observable Framework), so Node-only
  // globals are unavailable -- an earlier version referenced process.env directly and
  // crashed the whole chat panel on load (added d486b4753, reverted by 96c25f32f).
  // 2026-08-01: the endpoint is configurable again, but with NO Node global here.
  // observablehq.config.js runs in Node at build time and emits window.__CHAT_API__ /
  // window.__CHAT_TOKEN__ as plain globals; we read those and fall back to localhost,
  // so local dev and any build with the env vars unset behave exactly as before.
  // Do NOT reintroduce process.env in this file.
  const API_BASE = ((typeof window !== "undefined" && window.__CHAT_API__) || "http://127.0.0.1:8000").replace(/\/$/, "");
  const API_TOKEN = (typeof window !== "undefined" && window.__CHAT_TOKEN__) || "";
  const IS_LOCAL_API = /^https?:\/\/(127\.0\.0\.1|localhost)\b/.test(API_BASE);
  // Server-assigned conversation id, echoed back so follow-ups keep context.
  let sessionId = null;
  const apiUrl = `${API_BASE}/ask`;
  const resetUrl = `${API_BASE}/reset`;
  const healthUrl = `${API_BASE}/health`;
  const authHeader = API_TOKEN ? {"Authorization": `Bearer ${API_TOKEN}`} : {};
  const apiCommand = "cd KalshiData/python && python -m uvicorn api:app --port 8000";
  const HISTORY_KEY = "kalshi_chat_history";
  const PREFILL_KEY = "kalshi_chat_prefill";
  const HISTORY_MAX = 10;
  const EXAMPLES = [
    "Find days where volume rose but fee rate fell, and explain the likely mix shift",
    "Compare taker P&L in sports vs non-sports since February 2026",
    "Which markets drove the biggest parlay loss days in April 2026?",
    "Show categories where large-trade share spiked before total volume did"
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
    <summary class="chat-examples-label">Less obvious questions to try</summary>
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

  try {
    const pending = JSON.parse(localStorage.getItem(PREFILL_KEY) || "null");
    if (pending?.question) {
      textarea.value = pending.context
        ? `${pending.question}\n\nContext: ${pending.context}`
        : pending.question;
      replyLabel.textContent = "Ask about the page you came from";
      formWrapper.open = true;
      localStorage.removeItem(PREFILL_KEY);
    }
  } catch {}

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
      const response = await fetch(healthUrl, {headers: authHeader});
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
        headers: {...authHeader, "Content-Type": "application/json"},
        body: JSON.stringify(sessionId ? {question, session_id: sessionId} : {question})
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json();
      // 2026-08-01: echo the server-assigned session id back on the next turn.
      // Without this, _get_or_create_session(None) minted a fresh uuid per request so
      // _history_turns() always returned [] -- multi-turn context was silently dead.
      if (data.session_id) sessionId = data.session_id;

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
          const pending = html`<div class="chart-note chat-insights-pending">Running deeper analysis with the primary model. Context queries take a few seconds; the analysis streams in as it's written.</div>`;
          insightsBtn.after(pending);

          // Streaming path (2026-06-12): /insights/stream sends SSE deltas so the
          // analysis appears as it's written (first words in ~2-3s) instead of one
          // blob after 10-20s. Renders plain text while streaming, then swaps to
          // sanitized markdown at completion. Any stream failure falls back to the
          // original one-shot /insights below.
          let streamed = null; // {text, meta} on success
          try {
            const resp = await fetch(`${apiUrl.replace("/ask", "/insights/stream")}`, {
              method: "POST",
              headers: {...authHeader, "Content-Type": "application/json"},
              body: JSON.stringify({question, sql: data.sql, rows: data.rows, columns: data.columns})
            });
            if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
            const liveEl = html`<div class="chat-deep-insights"></div>`;
            const reader = resp.body.getReader();
            const dec = new TextDecoder();
            let buf = "", text = "", meta = null, streamErr = null;
            for (;;) {
              const {done, value} = await reader.read();
              if (done) break;
              buf += dec.decode(value, {stream: true});
              let idx;
              while ((idx = buf.indexOf("\n\n")) >= 0) {
                const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
                let ev = "message", dataLine = "";
                for (const line of frame.split("\n")) {
                  if (line.startsWith("event:")) ev = line.slice(6).trim();
                  else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
                }
                if (!dataLine || dataLine === "[DONE]") continue;
                let obj; try { obj = JSON.parse(dataLine); } catch { continue; }
                if (ev === "error") { streamErr = obj.error || "stream error"; }
                else if (ev === "meta") { meta = obj; }
                else if (obj.delta) {
                  text += obj.delta;
                  if (!liveEl.isConnected) pending.after(liveEl);
                  liveEl.textContent = text;
                }
              }
            }
            if (streamErr && !text) throw new Error(streamErr);
            if (!text) throw new Error("empty stream");
            liveEl.remove();
            streamed = {text, meta};
          } catch (e) {
            streamed = null; // fall through to the one-shot endpoint
          }

          try {
            let ins;
            if (streamed) {
              ins = {
                insights: streamed.text,
                evidence: streamed.meta?.evidence,
                context_sql: streamed.meta?.context_sql,
                elapsed_ms: streamed.meta?.elapsed_ms
              };
            } else {
              const insResp = await fetch(`${apiUrl.replace("/ask", "/insights")}`, {
                method: "POST",
                headers: {...authHeader, "Content-Type": "application/json"},
                body: JSON.stringify({question, sql: data.sql, rows: data.rows, columns: data.columns})
              });
              if (!insResp.ok) throw new Error(`HTTP ${insResp.status}`);
              ins = await insResp.json();
              if (ins.error) throw new Error(ins.error);
            }
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
    try { await fetch(resetUrl, {method: "POST", headers: authHeader}); } catch {}
    sessionId = null;  // 2026-08-01: drop the conversation id so /reset really starts fresh
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
