const searchToggle = document.getElementById("searchToggle");
const searchPanel = document.getElementById("searchPanel");
const closeSearch = document.getElementById("closeSearch");

if (searchToggle && searchPanel) {
  searchToggle.addEventListener("click", () => searchPanel.classList.add("open"));
}

if (closeSearch && searchPanel) {
  closeSearch.addEventListener("click", () => searchPanel.classList.remove("open"));
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && searchPanel) {
    searchPanel.classList.remove("open");
  }
});
