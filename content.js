(() => {
  "use strict";

  // Only run on sites with "quan" in the domain
  if (!window.location.hostname.includes("quan")) {
    return;
  }

  // Settings management
  let isEnabled = true;

  // Load settings from storage
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({ enabled: true });
      isEnabled = settings.enabled;

      // On initial load, just render if enabled. Don't reload if disabled.
      if (isEnabled) {
        renderInElement(document.body);
      }
    } catch (e) {
      console.warn('Failed to load settings, using defaults');
    }
  }

  // Listen for settings changes
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
      isEnabled = message.settings.enabled;

      if (!isEnabled) {
        clearRenderedMath();
      } else {
        renderInElement(document.body);
      }

      sendResponse({ success: true });
    }
  });

  // Function to clear rendered math
  function clearRenderedMath() {
    // Find all elements that have been rendered
    const elements = document.querySelectorAll('[data-katex-hash]');

    elements.forEach(el => {
      // Restore original HTML if we have it
      const original = el.getAttribute("data-katex-original");
      if (original) {
        el.innerHTML = original;
      }

      // Clean up our data attributes
      el.removeAttribute('data-katex-hash');
      el.removeAttribute('data-katex-original');
    });

    // No more page reload needed!
  }

  function ensureKaTeXStylesheet() {
    const id = "katex-ext-stylesheet";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("vendor/katex.min.css");
    document.head.appendChild(link);
  }

  ensureKaTeXStylesheet();

  // Safety: if KaTeX auto-render did not load, do nothing.
  if (typeof renderMathInElement !== "function") return;

  // Do not render inside these tags.
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "TEXTAREA", "INPUT", "PRE", "CODE", "NOSCRIPT"
  ]);

  function isInsideSkippable(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    let cur = el;
    while (cur) {
      // Skip KaTeX output so we do not touch already-rendered math.
      if (cur.classList && (cur.classList.contains("katex") || cur.classList.contains("katex-display"))) {
        return true;
      }
      if (SKIP_TAGS.has(cur.tagName)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  // FNV-1a hash (fast) so we can re-render when content changes.
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16);
  }

  // Quick test to avoid touching nodes that obviously do not contain math delimiters.
  // Added support for bracket-style: [ ... ] that contains LaTeX commands (\frac, \sum, etc.).
  function looksLikeMath(text) {
    if (!text) return false;
    const hasStandardDelims =
      text.includes("\\(") || text.includes("\\)") ||
      text.includes("\\[") || text.includes("\\]") ||
      text.includes("$$") ||
      text.includes("$");

    const hasBracketLatex =
      text.includes("[") && text.includes("]") && text.includes("\\");

    return hasStandardDelims || hasBracketLatex;
  }

  function normalizeSquareBracketDisplayMath(rootNode) {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const tn of nodes) {
      const parent = tn.parentElement;
      if (!parent) continue;

      let t = tn.nodeValue;
      if (!t || !t.includes("[") || !t.includes("]")) continue;

      // Skip if text already contains proper LaTeX delimiters
      if (t.includes("\\[") || t.includes("\\]")) continue;

      // Convert: [ ... ] -> \[ ... \]
      // Only if it looks "mathy" (avoid normal bracketed prose / links)
      // Avoid Markdown links: [text](url)
      t = t.replace(/\[\s*([\s\S]*?)\s*\](?!\()/g, (match, inner) => {
        const s = (inner || "").trim();
        if (!s) return match;

        const looksMathy =
          s.includes("\\") ||  // \frac, \int, \alpha, etc.
          s.includes("=")  ||
          s.includes("^")  ||
          s.includes("_")  ||
          /d[A-Za-z]\s*\/\s*d[A-Za-z]/.test(s); // e.g., dQ/dt

        if (!looksMathy) return match;
        if (s.length > 1500) return match;          // guard
        if (s.includes("\\[") || s.includes("\\]")) return match; // no double-wrap

        return `\\[${s}\\]`;
      });

      if (t !== tn.nodeValue) tn.nodeValue = t;
    }
  }

  function normalizeSpacedParenInlineMath(rootNode) {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const tn of nodes) {
      const parent = tn.parentElement;
      if (!parent) continue;

      let t = tn.nodeValue;
      if (!t || !t.includes("(") || !t.includes(")")) continue;

      // Skip if text already contains proper LaTeX delimiters
      if (t.includes("\\(") || t.includes("\\)")) continue;

      // Convert: ( Q_0 ) -> \( Q_0 \)
      // Only if it looks mathy (underscore, caret, backslash, =, >, <, digits, function notation)
      t = t.replace(/\(\s*([^)]*?)\s*\)/g, (match, inner) => {
        const s = (inner || "").trim();
        if (!s) return match;

        // Do not touch already-rendered or escaped math delimiters
        if (s.includes("\\(") || s.includes("\\)") || s.includes("\\[") || s.includes("\\]")) return match;

        const looksMathy =
          s.includes("_") ||
          s.includes("^") ||
          s.includes("\\") ||
          s.includes("=") ||
          s.includes(">") ||
          s.includes("<") ||
          /[0-9]/.test(s) ||
          /^[A-Za-z]+\([^)]+\)$/.test(s); // e.g., Q(t)

        if (!looksMathy) return match;
        if (s.length > 80) return match; // guard: avoid converting long prose

        return `\\(${s}\\)`;
      });

      if (t !== tn.nodeValue) tn.nodeValue = t;
    }
  }

  function renderInElement(el) {
    if (!isEnabled) return;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (isInsideSkippable(el)) return;

    const rawText = el.textContent || "";
    if (!looksLikeMath(rawText)) return;

    // If nothing changed since last render pass, skip.
    const currentHash = fnv1a(rawText);
    const lastHash = el.getAttribute("data-katex-hash");
    if (lastHash === currentHash) return;

    try {
      // Store original HTML before normalizing/rendering (for toggle without reload)
      if (!el.getAttribute("data-katex-original")) {
        el.setAttribute("data-katex-original", el.innerHTML);
      }

      // Normalize [ ... ] style math into \[ ... \] first.
      normalizeSquareBracketDisplayMath(el);
      normalizeSpacedParenInlineMath(el);

      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false,
        strict: "ignore"
      });

      // Store hash of current textContent; changes later will trigger re-render.
      const afterText = el.textContent || "";
      el.setAttribute("data-katex-hash", fnv1a(afterText));
    } catch (e) {
      // Intentionally silent: do not break the page.
    }
  }

  // Initial pass.
  loadSettings();

  // Observe DOM additions + text edits (characterData) common in chat embeds.
  const obs = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    for (const m of mutations) {
      if (m.type === "characterData") {
        const p = m.target && m.target.parentElement;
        if (p) renderInElement(p);
        continue;
      }

      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const p = node.parentElement;
          if (p) renderInElement(p);
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        renderInElement(node);

        const candidates = node.querySelectorAll
          ? node.querySelectorAll("div, p, li, span, section, article")
          : [];
        for (const c of candidates) renderInElement(c);
      }
    }
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();