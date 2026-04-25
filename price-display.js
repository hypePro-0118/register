const STORAGE_KEY = "bunfree-accounting-state-v1";

const bookButtonList = document.getElementById("book-button-list");
const selectedTitle = document.getElementById("selected-title");
const selectedPrice = document.getElementById("selected-price");
const priceNote = document.getElementById("price-note");
const emptyBooksTemplate = document.getElementById("empty-books-template");
const bookCountLabel = document.getElementById("book-count-label");

let books = loadBooks();
let selectedBookId = books[0]?.id ?? null;

render();
window.addEventListener("storage", handleStorageChange);

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
}

function renderBookCount() {
  bookCountLabel.textContent = `${books.length}冊`;
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
      render();
    });

    const title = document.createElement("span");
    title.className = "button-title";
    title.textContent = book.name;

    const meta = document.createElement("span");
    meta.className = "button-meta";
    meta.textContent = `${formatYen(book.price)} / 在庫 ${book.stock}冊`;

    button.append(title, meta);
    bookButtonList.append(button);
  });
}

function renderSelectedPrice() {
  const selectedBook = books.find((book) => book.id === selectedBookId);

  if (!selectedBook) {
    selectedTitle.textContent = "未選択";
    selectedPrice.textContent = "0円";
    priceNote.textContent = "左の一覧から表示したい書籍を選んでください。";
    return;
  }

  selectedTitle.textContent = selectedBook.name;
  selectedPrice.textContent = formatYen(selectedBook.price);
  priceNote.textContent = "選択中の本の価格を大きく表示しています。別の本をタップすると表示が切り替わります。";
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString("ja-JP")}円`;
}
