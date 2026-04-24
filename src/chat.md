---
title: Ask Data
---

<div class="page-hero">
  <div class="page-eyebrow">Local LLM</div>
  <h1>Ask the Kalshi Data</h1>
  <p class="page-lead">Ask natural-language questions against the local DuckDB layer. The dashboard sends the question to a local FastAPI server, which generates SQL with your configured LLM provider and runs it against your Parquet and CSV files.</p>
  <div class="page-meta">Requires <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>, plus the local API server.</div>
</div>

<p class="section-intro">This page is local-only. Your API key and the full dataset stay on your machine; the browser only talks to <code>http://127.0.0.1:8000/ask</code>.</p>

```js
{
  const apiUrl = "http://127.0.0.1:8000/ask";
  const apiCommand = "cd KalshiData/python && python -m uvicorn api:app --port 8000";
  const panel = html`<div class="chat-panel"></div>`;
  const form = html`<form class="chat-form">
    <label for="chat-question">Question</label>
    <textarea id="chat-question" class="chat-question" rows="4" placeholder="What was the total volume on February 8, 2026?"></textarea>
    <div class="chat-actions">
      <button type="submit" class="ui-button">Ask</button>
      <button type="button" class="ui-button is-subtle">Clear</button>
    </div>
  </form>`;
  const output = html`<div class="chat-output"></div>`;

  const textarea = form.querySelector("textarea");
  const [submitButton, clearButton] = form.querySelectorAll("button");

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? "Asking..." : "Ask";
  }

  function showError(message) {
    const error = html`<div class="chart-note chat-error"><strong>Query issue:</strong> <span></span></div>`;
    error.querySelector("span").textContent = message;
    output.replaceChildren(error);
  }

  function showResult(data) {
    output.replaceChildren();

    if (data.error) {
      showError(data.error);
      return;
    }

    if (data.sql) {
      const details = html`<details class="surface-card compact-details chat-sql">
        <summary>Generated SQL</summary>
        <pre><code></code></pre>
      </details>`;
      details.querySelector("code").textContent = data.sql;
      output.append(details);
    }

    if (data.note) {
      output.append(html`<div class="chart-note">${data.note}</div>`);
    }

    if (data.rows?.length) {
      output.append(Inputs.table(data.rows, {
        columns: data.columns,
        rows: Math.min(25, data.rows.length),
        layout: "auto"
      }));
    } else {
      output.append(html`<div class="chart-note">The query ran successfully but returned no rows.</div>`);
    }
  }

  clearButton.addEventListener("click", () => {
    textarea.value = "";
    output.replaceChildren();
    textarea.focus();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const question = textarea.value.trim();
    if (!question) {
      showError("Enter a question first.");
      return;
    }

    setBusy(true);
    output.replaceChildren(html`<div class="chart-note">Asking the local API...</div>`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({question})
      });

      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json();
      showResult(data);
    } catch (error) {
      showError(`Start the local API server first: ${apiCommand}`);
    } finally {
      setBusy(false);
    }
  });

  panel.append(form, output);
  display(panel);
}
```

<div class="chart-note"><strong>Tip:</strong> Summary questions are usually fastest when they can use the pre-aggregated tables. Detailed trade-level questions may take longer and the API cuts off queries that run for more than 15 seconds.</div>
