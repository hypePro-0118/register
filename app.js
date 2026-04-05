const STORAGE_KEY = "bunfree-accounting-state-v1";

const state = loadState();

const bookForm = document.getElementById("book-form");
const bookNameInput = document.getElementById("book-name");
const bookPriceInput = document.getElementById("book-price");
const bookStockInput = document.getElementById("book-stock");
const inventoryBody = document.getElementById("inventory-body");
const checkoutList = document.getElementById("checkout-list");
const grandTotal = document.getElementById("grand-total");
const receivedAmountInput = document.getElementById("received-amount");
const changeAmount = document.getElementById("change-amount");
const checkoutNote = document.getElementById("checkout-note");
const completeSaleButton = document.getElementById("complete-sale");
const resetQuantitiesButton = document.getElementById("reset-quantities");
const historyList = document.getElementById("history-list");
const exportCsvButton = document.getElementById("export-csv");
const clearHistoryButton = document.getElementById("clear-history");
const bookCount = document.getElementById("book-count");
const salesTotal = document.getElementById("sales-total");
const saleCount = document.getElementById("sale-count");
const emptyTemplate = document.getElementById("empty-template");

render();

bookForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = bookNameInput.value.trim();
  const price = toNumber(bookPriceInput.value);
  const stock = toNumber(bookStockInput.value);

  if (!name) {
    return;
  }

  state.books.unshift({
    id: crypto.randomUUID(),
    name,
    price,
    stock,
    sold: 0,
    quantity: 0,
  });

  persist();
  render();
  bookForm.reset();
  bookNameInput.focus();
});

receivedAmountInput.addEventListener("input", renderSummary);
resetQuantitiesButton.addEventListener("click", () => {
  state.books.forEach((book) => {
    book.quantity = 0;
  });
  persist();
  render();
});

completeSaleButton.addEventListener("click", completeSale);
exportCsvButton.addEventListener("click", exportCsv);
clearHistoryButton.addEventListener("click", () => {
  if (!state.sales.length) {
    return;
  }

  const confirmed = window.confirm("販売履歴をすべて削除しますか？");
  if (!confirmed) {
    return;
  }

  state.sales = [];
  state.books.forEach((book) => {
    book.sold = 0;
  });
  persist();
  render();
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { books: [], sales: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      books: Array.isArray(parsed.books) ? parsed.books : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    };
  } catch {
    return { books: [], sales: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderInventory();
  renderCheckout();
  renderHistory();
  renderDashboard();
  renderSummary();
}

function renderInventory() {
  inventoryBody.innerHTML = "";

  if (!state.books.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.innerHTML = '<div class="empty-state">まだ本が登録されていません。</div>';
    row.append(cell);
    inventoryBody.append(row);
    return;
  }

  state.books.forEach((book) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = book.name;

    const priceCell = document.createElement("td");
    const priceInput = createInlineNumberInput(book.price, 0, (value) => {
      book.price = value;
      persist();
      render();
    });
    priceCell.append(priceInput);

    const stockCell = document.createElement("td");
    const stockInput = createInlineNumberInput(book.stock, 0, (value) => {
      book.stock = value;
      if (book.quantity > book.stock) {
        book.quantity = book.stock;
      }
      persist();
      render();
    });
    stockCell.append(stockInput);

    const soldCell = document.createElement("td");
    soldCell.textContent = `${book.sold || 0}冊`;

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "row-action";
    removeButton.textContent = "削除";
    removeButton.addEventListener("click", () => {
      const confirmed = window.confirm(`「${book.name}」を削除しますか？`);
      if (!confirmed) {
        return;
      }
      state.books = state.books.filter((item) => item.id !== book.id);
      persist();
      render();
    });
    actionCell.append(removeButton);

    row.append(nameCell, priceCell, stockCell, soldCell, actionCell);
    inventoryBody.append(row);
  });
}

function createInlineNumberInput(value, min, onCommit) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.step = "1";
  input.value = String(value);
  input.className = "inline-input";
  input.addEventListener("change", () => {
    onCommit(toNumber(input.value));
  });
  return input;
}

function renderCheckout() {
  checkoutList.innerHTML = "";

  if (!state.books.length) {
    checkoutList.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  state.books.forEach((book) => {
    const item = document.createElement("article");
    item.className = "checkout-item";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "checkout-name";
    name.textContent = book.name;

    const meta = document.createElement("div");
    meta.className = "checkout-meta";
    meta.textContent = `${formatYen(book.price)} / 在庫 ${book.stock}冊`;

    info.append(name, meta);

    const controls = document.createElement("div");
    controls.className = "qty-box";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "qty-button";
    minus.textContent = "-";
    minus.addEventListener("click", () => changeQuantity(book.id, -1));

    const qty = document.createElement("span");
    qty.className = "qty-value";
    qty.textContent = String(book.quantity || 0);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "qty-button";
    plus.textContent = "+";
    plus.disabled = book.quantity >= book.stock;
    plus.addEventListener("click", () => changeQuantity(book.id, 1));

    controls.append(minus, qty, plus);
    item.append(info, controls);
    checkoutList.append(item);
  });
}

function changeQuantity(bookId, delta) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) {
    return;
  }

  const next = Math.max(0, Math.min(book.stock, (book.quantity || 0) + delta));
  book.quantity = next;
  persist();
  render();
}

function renderSummary() {
  const total = calculateTotal();
  const received = toNumber(receivedAmountInput.value);
  const change = Math.max(received - total, 0);

  grandTotal.textContent = formatYen(total);
  changeAmount.textContent = formatYen(change);

  if (total === 0) {
    checkoutNote.textContent = "本を選ぶと合計が自動で計算されます。";
    completeSaleButton.disabled = true;
    completeSaleButton.style.opacity = "0.45";
    return;
  }

  if (received === 0) {
    checkoutNote.textContent = "受取金額を入力すると、おつりが表示されます。";
    completeSaleButton.disabled = false;
    completeSaleButton.style.opacity = "1";
    return;
  }

  if (received < total) {
    checkoutNote.textContent = `受取金額が ${formatYen(total - received)} 足りません。`;
    completeSaleButton.disabled = true;
    completeSaleButton.style.opacity = "0.45";
    return;
  }

  checkoutNote.textContent = `会計可能です。おつりは ${formatYen(change)} です。`;
  completeSaleButton.disabled = false;
  completeSaleButton.style.opacity = "1";
}

function calculateTotal() {
  return state.books.reduce((sum, book) => sum + book.price * (book.quantity || 0), 0);
}

function completeSale() {
  const lineItems = state.books
    .filter((book) => (book.quantity || 0) > 0)
    .map((book) => ({
      id: book.id,
      name: book.name,
      price: book.price,
      quantity: book.quantity,
      subtotal: book.price * book.quantity,
    }));

  if (!lineItems.length) {
    return;
  }

  const total = calculateTotal();
  const received = toNumber(receivedAmountInput.value);

  if (received > 0 && received < total) {
    return;
  }

  lineItems.forEach((item) => {
    const book = state.books.find((target) => target.id === item.id);
    if (!book) {
      return;
    }
    book.stock -= item.quantity;
    book.sold = (book.sold || 0) + item.quantity;
    book.quantity = 0;
  });

  state.sales.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    total,
    received,
    change: Math.max(received - total, 0),
    items: lineItems,
  });

  receivedAmountInput.value = "";
  persist();
  render();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!state.sales.length) {
    historyList.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  state.sales.forEach((sale) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const date = document.createElement("strong");
    date.textContent = formatDateTime(sale.timestamp);

    const total = document.createElement("span");
    total.className = "history-total";
    total.textContent = formatYen(sale.total);

    top.append(date, total);

    const lines = document.createElement("div");
    lines.className = "history-lines";
    lines.innerHTML = sale.items
      .map((line) => `${escapeHtml(line.name)} x ${line.quantity}冊 = ${formatYen(line.subtotal)}`)
      .join("<br>");

    const payment = document.createElement("div");
    payment.className = "history-lines";
    payment.innerHTML = `受取 ${formatYen(sale.received)} / おつり ${formatYen(sale.change)}`;

    item.append(top, lines, payment);
    historyList.append(item);
  });
}

function renderDashboard() {
  bookCount.textContent = String(state.books.length);
  salesTotal.textContent = formatYen(state.sales.reduce((sum, sale) => sum + sale.total, 0));
  saleCount.textContent = String(state.sales.length);
}

function exportCsv() {
  if (!state.sales.length) {
    window.alert("CSVに出力できる販売履歴がありません。");
    return;
  }

  const rows = [
    ["timestamp", "title", "price", "quantity", "subtotal", "sale_total", "received", "change"],
  ];

  state.sales.forEach((sale) => {
    sale.items.forEach((item) => {
      rows.push([
        sale.timestamp,
        item.name,
        item.price,
        item.quantity,
        item.subtotal,
        sale.total,
        sale.received,
        sale.change,
      ]);
    });
  });

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bunfree-sales-${formatFileDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
}

function formatYen(value) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}`;
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
