const markdownEditor = document.getElementById("markdownEditor");
const richEditor = document.getElementById("richEditor");
const preview = document.getElementById("preview");
const previewPane = document.getElementById("previewPane");
const noteName = document.getElementById("noteName");
const exportBtn = document.getElementById("exportBtn");
const pdfBtn = document.getElementById("pdfBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const sessionModal = document.getElementById("sessionModal");
const modalClose = document.getElementById("modalClose");
const modalNew = document.getElementById("modalNew");
const fileInput = document.getElementById("fileInput");
const modeButtons = document.querySelectorAll(".mode-btn");

const defaultTemplates = {
  markdown: `# Welcome to ThatNote\n\nStart typing in **Markdown** or add inline math like $E=mc^2$.\n\n## Quick math\n\n$$\\int_0^1 x^2 dx = \\frac{1}{3}$$\n\n- Clean previews\n- Export as Markdown\n`,
  latex: `\\int_0^1 x^2 dx = \\frac{1}{3}\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}`,
  rich: "<h1>Welcome to ThatNote</h1><p>Write rich text here. Use headings, lists, and emphasis for a polished layout.</p>",
};

let currentMode = "markdown";
let modeContent = {
  markdown: defaultTemplates.markdown,
  latex: defaultTemplates.latex,
  rich: defaultTemplates.rich,
};

let currentSessionId = Date.now().toString();
let historyTimeout;

const saveToHistory = () => {
  saveCurrentContent();
  const history = JSON.parse(localStorage.getItem("thatnote.history") || "[]");
  
  const entry = {
    id: currentSessionId,
    name: noteName.value.trim() || "Untitled",
    date: new Date().toISOString(),
    mode: currentMode,
    content: modeContent,
    preview: (currentMode === "rich" ? richEditor.innerText : markdownEditor.value).substring(0, 80).replace(/\n/g, " ")
  };

  const existingIndex = history.findIndex(h => h.id === currentSessionId);
  if (existingIndex >= 0) {
    history[existingIndex] = entry;
    // Move to top
    history.unshift(history.splice(existingIndex, 1)[0]);
  } else {
    history.unshift(entry);
  }

  if (history.length > 10) {
    history.pop();
  }

  localStorage.setItem("thatnote.history", JSON.stringify(history));
};

const triggerHistorySave = () => {
  clearTimeout(historyTimeout);
  historyTimeout = setTimeout(saveToHistory, 1000);
};

const configureMarked = () => {
  const markedLib = window.marked;
  if (!markedLib || configureMarked.hasConfigured) {
    return markedLib;
  }

  markedLib.setOptions({
    breaks: true,
    gfm: true,
  });
  configureMarked.hasConfigured = true;
  return markedLib;
};

configureMarked.hasConfigured = false;
configureMarked();

const setStatus = (message) => {
  statusText.textContent = message;
};

const updatePreview = async () => {
  if (currentMode === "rich") {
    return;
  }

  const raw = markdownEditor.value;
  preview.classList.toggle("latex-only", currentMode === "latex");

  if (currentMode === "markdown") {
    const markedLib = configureMarked();
    if (markedLib && typeof markedLib.parse === "function") {
      const html = markedLib.parse(raw);
      const purifier = window.DOMPurify;
      preview.innerHTML = purifier && typeof purifier.sanitize === "function" ? purifier.sanitize(html) : html;
    } else {
      preview.textContent = raw;
    }
  } else {
    preview.textContent = `\\[${raw}\\]`;
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    await window.MathJax.typesetPromise([preview]);
  }
};

const saveCurrentContent = () => {
  if (currentMode === "rich") {
    modeContent.rich = richEditor.innerHTML;
  } else {
    modeContent[currentMode] = markdownEditor.value;
  }
};

const setMode = (mode, force = false) => {
  if (!force && currentMode === mode) {
    return;
  }

  if (!force) {
    saveCurrentContent();
  }
  currentMode = mode;

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  if (mode === "rich") {
    markdownEditor.classList.add("hidden");
    richEditor.classList.remove("hidden");
    previewPane.classList.add("hidden");
    richEditor.innerHTML = modeContent.rich || defaultTemplates.rich;
  } else {
    markdownEditor.classList.remove("hidden");
    richEditor.classList.add("hidden");
    previewPane.classList.remove("hidden");
    markdownEditor.value = modeContent[mode] || defaultTemplates[mode];
    updatePreview();
  }

  setStatus(`Mode: ${mode.toUpperCase()}`);
};

const startNewSession = () => {
  currentSessionId = Date.now().toString();
  modeContent = {
    markdown: defaultTemplates.markdown,
    latex: defaultTemplates.latex,
    rich: defaultTemplates.rich,
  };
  noteName.value = "";
  fileInput.value = "";
  setMode("markdown", true);
  setStatus("Editing");
  if (resetBtn) resetBtn.disabled = true;
};

const showSessionModal = () => {
  if (!sessionModal) {
    return;
  }

  sessionModal.classList.remove("hidden");
  sessionModal.toggleAttribute("hidden", false);
  sessionModal.setAttribute("aria-hidden", "false");
};

const hideSessionModal = () => {
  if (!sessionModal) {
    return;
  }

  sessionModal.classList.add("hidden");
  sessionModal.toggleAttribute("hidden", true);
  sessionModal.setAttribute("aria-hidden", "true");
};

window.ThatNoteModal = {
  open: showSessionModal,
  close: hideSessionModal,
};

const applyImport = (content, mode, name) => {
  currentSessionId = Date.now().toString();
  modeContent[mode] = content;
  if (name) {
    noteName.value = name;
  }
  setMode(mode, true);
  setStatus("Editing");
  if (resetBtn) resetBtn.disabled = false;
  triggerHistorySave();
};

const loadSessionImport = () => {
  const content = sessionStorage.getItem("thatnote.importContent");
  const mode = sessionStorage.getItem("thatnote.importMode");
  const name = sessionStorage.getItem("thatnote.importName");

  if (content && mode) {
    applyImport(content, mode, name);
    return true;
  }

  sessionStorage.removeItem("thatnote.importContent");
  sessionStorage.removeItem("thatnote.importMode");
  sessionStorage.removeItem("thatnote.importName");
  return false;
};

markdownEditor.addEventListener("input", () => {
  setStatus("Unsaved changes");
  if (currentMode !== "rich") {
    updatePreview();
  }
  if (resetBtn) resetBtn.disabled = false;
  triggerHistorySave();
});

richEditor.addEventListener("input", () => {
  setStatus("Unsaved changes");
  if (resetBtn) resetBtn.disabled = false;
  triggerHistorySave();
});

noteName.addEventListener("input", triggerHistorySave);

exportBtn.addEventListener("click", () => {
  const name = noteName.value.trim() || "thatnote";
  let blob;
  let extension;
  if (currentMode === "rich") {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body>${richEditor.innerHTML}</body></html>`;
    blob = new Blob([html], { type: "text/html" });
    extension = "html";
  } else {
    blob = new Blob([markdownEditor.value], { type: "text/markdown" });
    extension = "md";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus("Exported");
});

if (pdfBtn) {
  pdfBtn.addEventListener("click", () => {
    const content = currentMode === "rich" ? richEditor : preview;
    const opt = {
      margin: 0.5,
      filename: (noteName.value.trim() || "thatnote") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    // @ts-ignore
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(content).save();
    } else {
      alert("PDF library not loaded.");
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    showSessionModal();
  });
}

modalNew.addEventListener("click", () => {
  hideSessionModal();
  startNewSession();
});

if (modalClose) {
  modalClose.addEventListener("click", () => {
    hideSessionModal();
  });
}

document.addEventListener("click", (event) => {
  const closeTarget = event.target.closest("[data-modal-close]");
  if (closeTarget) {
    hideSessionModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sessionModal && !sessionModal.classList.contains("hidden")) {
    hideSessionModal();
  }
});

if (sessionModal) {
  sessionModal.addEventListener("click", (event) => {
    if (event.target === sessionModal) {
      hideSessionModal();
    }
  });
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const inferredMode = extension === "html" ? "rich" : "markdown";

  const reader = new FileReader();
  reader.onload = (e) => {
    noteName.value = file.name.replace(/\.[^/.]+$/, "");
    applyImport(String(e.target.result || ""), inferredMode, noteName.value);
    hideSessionModal();
  };
  reader.readAsText(file);
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  hideSessionModal();

  const imported = loadSessionImport();
  if (!imported) {
    startNewSession();
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      setStatus("Editing");
    });
  }
});
