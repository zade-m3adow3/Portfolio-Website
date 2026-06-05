/**
 * ai-widget.js
 * Controls the floating AI chat interface.
 */

(function () {
  "use strict";

  function initAIWidget() {
    const orb = document.getElementById("ai-orb-btn");
    const modal = document.getElementById("ai-modal");
    const closeBtn = document.getElementById("ai-modal-close");
    const chatArea = document.getElementById("ai-chat-area");
    const input = document.getElementById("ai-input");
    const submitBtn = document.getElementById("ai-submit");

    if (!orb || !modal || !chatArea || !input || !submitBtn) return;

    // Toggle Modal
    orb.addEventListener("click", () => {
      modal.classList.toggle("is-open");
      if (modal.classList.contains("is-open")) {
        input.focus();
      }
    });

    closeBtn.addEventListener("click", () => {
      modal.classList.remove("is-open");
    });

    // Handle Submission
    const handleSubmit = async () => {
      const text = input.value.trim();
      if (!text) return;

      appendUserMessage(text);
      input.value = "";
      submitBtn.disabled = true;
      const loadingEl = appendLoading();

      try {
        const response = await fetch("/api/query-thesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text })
        });

        const data = await response.json();
        loadingEl.remove();

        if (response.ok) {
          appendSystemMessage(data.answer, data.sources);
        } else {
          appendSystemMessage(`Error: ${data.error || "Failed to reach APU-X."}`, []);
        }
      } catch (err) {
        loadingEl.remove();
        appendSystemMessage("Connection error. The APU-X substrate is offline.", []);
      } finally {
        submitBtn.disabled = false;
        input.focus();
      }
    };

    submitBtn.addEventListener("click", handleSubmit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Message Rendering Helpers
    function appendUserMessage(text) {
      const el = document.createElement("div");
      el.className = "ai-msg ai-msg-user";
      el.textContent = text;
      chatArea.appendChild(el);
      scrollToBottom();
    }

    function appendLoading() {
      const el = document.createElement("div");
      el.className = "ai-loading";
      el.innerHTML = `<div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>`;
      chatArea.appendChild(el);
      scrollToBottom();
      return el;
    }

    function appendSystemMessage(answer, sources) {
      const el = document.createElement("div");
      el.className = "ai-msg ai-msg-system";
      
      // Basic markdown parsing for paragraphs and bold text
      let html = answer
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

      el.innerHTML = html;

      // Append Sources Pill if available
      if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement("div");
        sourcesDiv.className = "ai-sources";
        const uniqueSources = [...new Set(sources.map(s => s.chapter))];
        uniqueSources.forEach(src => {
          const pill = document.createElement("span");
          pill.className = "ai-source-pill";
          pill.textContent = src.replace('Chapter ', 'Ch ');
          sourcesDiv.appendChild(pill);
        });
        el.appendChild(sourcesDiv);
      }

      chatArea.appendChild(el);

      // Render KaTeX if window.katex exists
      if (window.katex) {
        renderMathInElement(el, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ],
          throwOnError: false
        });
      }

      scrollToBottom();
    }

    function scrollToBottom() {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  // Load KaTeX auto-render extension on the fly if needed
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAIWidget);
  } else {
    initAIWidget();
  }

  // Inject KaTeX auto-render script safely
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  document.head.appendChild(script);

})();
