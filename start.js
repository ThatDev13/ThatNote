const newBtn = document.getElementById("newBtn");
const fileInput = document.getElementById("fileInput");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

const redirectToEditor = () => {
  window.location.href = "editor.html";
};

newBtn.addEventListener("click", () => {
  sessionStorage.removeItem("thatnote.importContent");
  sessionStorage.removeItem("thatnote.importMode");
  sessionStorage.removeItem("thatnote.importName");
  redirectToEditor();
});

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    sessionStorage.removeItem("thatnote.importContent");
    sessionStorage.removeItem("thatnote.importMode");
    sessionStorage.removeItem("thatnote.importName");
    redirectToEditor();
  });
}

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    redirectToEditor();
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
    sessionStorage.setItem("thatnote.importContent", String(e.target.result || ""));
    sessionStorage.setItem("thatnote.importMode", inferredMode);
    sessionStorage.setItem("thatnote.importName", file.name.replace(/\.[^/.]+$/, ""));
    redirectToEditor();
  };
  reader.readAsText(file);
});

const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const loadHistory = () => {
  if (!historySection) return;
  
  const history = JSON.parse(localStorage.getItem("thatnote.history") || "[]");

  if (history.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historySection.classList.remove("hidden");
  historyList.innerHTML = "";

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    
    // Fallback for old history format if any
    const mode = item.mode || "markdown";
    const name = item.name || "Untitled";
    const date = item.date ? new Date(item.date).toLocaleString() : "Unknown date";
    // Check if content is object (new format) or string (if we had old format, but we don't yet)
    // We saved `modeContent` (object) as `entry.content`.
    const activeContent = (typeof item.content === 'object' && item.content !== null) 
                          ? (item.content[mode] || "") 
                          : (item.content || "");

    const preview = item.preview || "";

    div.innerHTML = `
            <div class="history-info">
                <div class="history-name">${name}</div>
                <div class="history-meta">${date} • ${mode.toUpperCase()}</div>
                ${preview ? `<div class="history-meta" style="color:var(--ink); opacity:0.8;">${preview}</div>` : ""}
            </div>
            <div style="opacity: 0.4">→</div>
        `;
    div.addEventListener("click", () => {
      sessionStorage.setItem("thatnote.importContent", activeContent);
      sessionStorage.setItem("thatnote.importMode", mode);
      sessionStorage.setItem("thatnote.importName", name);
      redirectToEditor();
    });
    historyList.appendChild(div);
  });
};

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Clear all history?")) {
      localStorage.removeItem("thatnote.history");
      loadHistory();
    }
  });
}

loadHistory();
