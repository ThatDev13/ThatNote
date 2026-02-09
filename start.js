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
  const inferredMode = extension === "html" ? "rich" : "markdown";

  const reader = new FileReader();
  reader.onload = (e) => {
    sessionStorage.setItem("thatnote.importContent", String(e.target.result || ""));
    sessionStorage.setItem("thatnote.importMode", inferredMode);
    sessionStorage.setItem("thatnote.importName", file.name.replace(/\.[^/.]+$/, ""));
    redirectToEditor();
  };
  reader.readAsText(file);
});
