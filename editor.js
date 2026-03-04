const markdownEditor = document.getElementById("markdownEditor");
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
};

let currentMode = "markdown";
let modeContent = {
  markdown: defaultTemplates.markdown,
  latex: defaultTemplates.latex,
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
    preview: markdownEditor.value.substring(0, 80).replace(/\n/g, " ")
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
  modeContent[currentMode] = markdownEditor.value;
};

const autoResizeEditor = () => {
  markdownEditor.style.height = "auto";
  markdownEditor.style.height = `${markdownEditor.scrollHeight}px`;
};

const setMode = (mode, force = false) => {
  if (!(mode in modeContent)) {
    mode = "markdown";
  }

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

  previewPane.classList.remove("hidden");
  markdownEditor.value = modeContent[mode] || defaultTemplates[mode];
  autoResizeEditor();
  updatePreview();

  setStatus(`Mode: ${mode.toUpperCase()}`);
};

const startNewSession = () => {
  currentSessionId = Date.now().toString();
  modeContent = {
    markdown: defaultTemplates.markdown,
    latex: defaultTemplates.latex,
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
  if (!(mode in modeContent)) {
    mode = "markdown";
  }

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
  autoResizeEditor();
  updatePreview();
  if (resetBtn) resetBtn.disabled = false;
  triggerHistorySave();
});

noteName.addEventListener("input", triggerHistorySave);

exportBtn.addEventListener("click", () => {
  const name = noteName.value.trim() || "thatnote";
  const blob = new Blob([markdownEditor.value], { type: "text/markdown" });
  const extension = "md";

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
  pdfBtn.addEventListener("click", async () => {
    await updatePreview();

    const pdfContent = document.createElement("div");
    pdfContent.style.position = "fixed";
    pdfContent.style.left = "-99999px";
    pdfContent.style.top = "0";
    pdfContent.style.width = "8.5in";
    pdfContent.style.padding = "0.5in";
    pdfContent.style.background = "#ffffff";
    pdfContent.style.color = "#1b1a18";
    pdfContent.style.fontFamily = '"Space Grotesk", "Trebuchet MS", sans-serif';
    pdfContent.style.lineHeight = "1.7";
    pdfContent.innerHTML = preview.innerHTML;
    document.body.appendChild(pdfContent);

    const opt = {
      margin: 0,
      filename: (noteName.value.trim() || "thatnote") + ".pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    try {
      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(pdfContent).save();
      } else {
        alert("PDF library not loaded.");
      }
    } finally {
      document.body.removeChild(pdfContent);
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
  const inferredMode = extension === "tex" || extension === "latex" ? "latex" : "markdown";

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
  autoResizeEditor();

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
