const STORAGE_KEY = "bunfree-accounting-state-v1";

const TEXT = {
  countSuffix: "\u518A",
  yenSuffix: "\u5186",
  stockLabel: "\u5728\u5eab",
  selectedNone: "\u672a\u9078\u629E",
  defaultNote: "\u5DE6\u306E\u4E00\u89A7\u304B\u3089\u8868\u793A\u3057\u305F\u3044\u66F8\u7C4D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002",
  activeNote: "\u9078\u629E\u4E2D\u306E\u672C\u306E\u4FA1\u683C\u3092\u5927\u304D\u304F\u8868\u793A\u3057\u3066\u3044\u307E\u3059\u3002\u5225\u306E\u672C\u3092\u30BF\u30C3\u30D7\u3059\u308B\u3068\u8868\u793A\u304C\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002",
};

const bookButtonList = document.getElementById("book-button-list");
const selectedTitle = document.getElementById("selected-title");
const selectedPrice = document.getElementById("selected-price");
const priceNote = document.getElementById("price-note");
const emptyBooksTemplate = document.getElementById("empty-books-template");
const bookCountLabel = document.getElementById("book-count-label");
const displayShell = document.getElementById("display-shell");
const backToListButton = document.getElementById("back-to-list");

let books = loadBooks();
let selectedBookId = books[0]?.id ?? null;
let focusMode = false;

render();
window.addEventListener("storage", handleStorageChange);
backToListButton.addEventListener("click", () => {
  focusMode = false;
  render();
});

function loadBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.books) ? parsed.books : [];
  } catch {
    return [];
  }
}

function handleStorageChange(event) {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  books = loadBooks();

  if (!books.some((book) => book.id === selectedBookId)) {
    selectedBookId = books[0]?.id ?? null;
  }

  render();
}

function render() {
  renderBookCount();
  renderBookButtons();
  renderSelectedPrice();
  renderFocusMode();
}

function renderBookCount() {
  bookCountLabel.textContent = `${books.length}${TEXT.countSuffix}`;
}

function renderBookButtons() {
  bookButtonList.innerHTML = "";

  if (!books.length) {
    bookButtonList.append(emptyBooksTemplate.content.cloneNode(true));
    return;
  }

  books.forEach((book) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `book-select-button${book.id === selectedBookId ? " is-active" : ""}`;
    button.addEventListener("click", () => {
      selectedBookId = book.id;
      focusMode = true;
      render();
    });

    const title = document.createElement("span");
    title.className = "button-title";
    title.textContent = book.name;

    const meta = document.createElement("span");
    meta.className = "button-meta";
    meta.textContent = `${formatYen(book.price)} / ${TEXT.stockLabel} ${book.stock}${TEXT.countSuffix}`;

    button.append(title, meta);
    bookButtonList.append(button);
  });
}

function renderSelectedPrice() {
  const selectedBook = books.find((book) => book.id === selectedBookId);

  if (!selectedBook) {
    selectedTitle.textContent = TEXT.selectedNone;
    selectedPrice.textContent = formatYen(0);
    priceNote.textContent = TEXT.defaultNote;
    return;
  }

  selectedTitle.textContent = selectedBook.name;
  selectedPrice.textContent = formatYen(selectedBook.price);
  priceNote.textContent = TEXT.activeNote;
}

function renderFocusMode() {
  const active = focusMode && books.length > 0 && books.some((book) => book.id === selectedBookId);
  displayShell.classList.toggle("focus-mode", active);
  backToListButton.hidden = !active;
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}${TEXT.yenSuffix}`;
}
