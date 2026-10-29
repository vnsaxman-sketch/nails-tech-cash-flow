import { useMemo, useState } from "react";
import type {
  IncomeEntry,
  PaymentMethod,
  ServiceCategory,
} from "./types";
import {
  loadIncomeEntries,
  loadSettings,
  replaceAllData,
  saveIncomeEntries,
  saveSettings,
} from "./storage";
import {
  biweeklyRange,
  dateRangeLabel,
  endOfDay,
  endOfMonth,
  endOfWeek,
  entryTotal,
  escapeCsv,
  filterByDateRange,
  formatMoney,
  getServiceDisplayName,
  startOfDay,
  startOfMonth,
  startOfWeek,
  todayText,
  totalIncome,
  totalServiceIncome,
  totalTips,
} from "./calculations";
import "./App.css";

type TabName = "dashboard" | "history" | "settings";

const serviceCategories: ServiceCategory[] = [
  "Manicure",
  "Full Set",
  "Gel/Refill",
  "Repair",
  "Fiberglass/Fill",
  "Wraps/Silk",
  "Cutdown",
  "French Manicure",
  "Refill",
  "Polish Change",
  "Hot oil",
  "Pedicure",
  "Acrylic",
  "Nail Art",
  "Extra Service",
];

const paymentMethods: PaymentMethod[] = [
  "Cash",
  "Zelle",
  "Venmo",
  "Credit Card",
  "Gift Card",
  "Coupon",
];

function createEmptyForm() {
  return {
    date: todayText(),
    serviceCategory: "Nails" as ServiceCategory,
    extraServiceNote: "",
    clientName: "",
    serviceAmount: "",
    tipAmount: "",
    paymentMethod: "Cash" as PaymentMethod,
    notes: "",
  };
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function App() {
  const [entries, setEntries] = useState<IncomeEntry[]>(loadIncomeEntries());
  const [settings, setSettings] = useState(loadSettings());
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyForm());
  const [historySearch, setHistorySearch] = useState("");

  const dashboard = useMemo(() => {
    const now = new Date();

    const todayEntries = filterByDateRange(
      entries,
      startOfDay(now),
      endOfDay(now),
    );

    const weekEntries = filterByDateRange(
      entries,
      startOfWeek(now),
      endOfWeek(now),
    );

    const monthEntries = filterByDateRange(
      entries,
      startOfMonth(now),
      endOfMonth(now),
    );

    const biweekly = biweeklyRange(settings.biweeklyStartDate, now);

    const biweeklyEntries = filterByDateRange(
      entries,
      biweekly.start,
      biweekly.end,
    );

    return {
      today: totalIncome(todayEntries),
      week: totalIncome(weekEntries),
      biweekly: totalIncome(biweeklyEntries),
      month: totalIncome(monthEntries),
      allTime: totalIncome(entries),
      monthServiceIncome: totalServiceIncome(monthEntries),
      monthTips: totalTips(monthEntries),
      biweeklyStart: biweekly.start,
      biweeklyEnd: biweekly.end,
    };
  }, [entries, settings.biweeklyStartDate]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);

      if (byDate !== 0) {
        return byDate;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const search = historySearch.trim().toLowerCase();

    if (!search) {
      return sortedEntries;
    }

    return sortedEntries.filter((entry) => {
      const searchableText = [
        entry.date,
        entry.serviceCategory,
        entry.extraServiceNote,
        entry.clientName,
        entry.paymentMethod,
        entry.notes,
        entry.serviceAmount,
        entry.tipAmount,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [historySearch, sortedEntries]);

  function updateForm(
    field: keyof ReturnType<typeof createEmptyForm>,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId(null);
  }

  function saveIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const serviceAmount = Number(form.serviceAmount);
    const tipAmount = Number(form.tipAmount || 0);

    if (!form.date) {
      alert("Please select an income date.");
      return;
    }

    if (!Number.isFinite(serviceAmount) || serviceAmount < 0) {
      alert("Please enter a valid service amount.");
      return;
    }

    if (!Number.isFinite(tipAmount) || tipAmount < 0) {
      alert("Please enter a valid tip amount.");
      return;
    }

    if (serviceAmount === 0 && tipAmount === 0) {
      alert("Service amount and tip cannot both be zero.");
      return;
    }

    if (
      form.serviceCategory === "Extra Service" &&
      !form.extraServiceNote.trim()
    ) {
      alert("Please describe the extra service.");
      return;
    }

    const currentTime = new Date().toISOString();

    const existingEntry = editingId
      ? entries.find((entry) => entry.id === editingId)
      : undefined;

    const newOrUpdatedEntry: IncomeEntry = {
      id: editingId ?? crypto.randomUUID(),
      date: form.date,
      serviceCategory: form.serviceCategory,
      extraServiceNote:
        form.serviceCategory === "Extra Service"
          ? form.extraServiceNote.trim()
          : "",
      clientName: form.clientName.trim(),
      serviceAmount,
      tipAmount,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(),
      createdAt: existingEntry?.createdAt ?? currentTime,
      updatedAt: currentTime,
    };

    let updatedEntries: IncomeEntry[];

    if (editingId) {
      updatedEntries = entries.map((entry) =>
        entry.id === editingId ? newOrUpdatedEntry : entry,
      );
    } else {
      updatedEntries = [newOrUpdatedEntry, ...entries];
    }

    setEntries(updatedEntries);
    saveIncomeEntries(updatedEntries);
    resetForm();
    setActiveTab("history");
  }

  function startEdit(entry: IncomeEntry) {
    setEditingId(entry.id);

    setForm({
      date: entry.date,
      serviceCategory: entry.serviceCategory,
      extraServiceNote: entry.extraServiceNote,
      clientName: entry.clientName,
      serviceAmount: String(entry.serviceAmount),
      tipAmount: String(entry.tipAmount),
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
    });

    setActiveTab("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(id: string) {
    const entry = entries.find((item) => item.id === id);

    if (!entry) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${getServiceDisplayName(entry)}" on ${entry.date}?`,
    );

    if (!confirmed) {
      return;
    }

    const updatedEntries = entries.filter((entry) => entry.id !== id);

    setEntries(updatedEntries);
    saveIncomeEntries(updatedEntries);

    if (editingId === id) {
      resetForm();
    }
  }

  function exportJsonBackup() {
    const backup = {
      appName: "Nails Tech Income Tracker",
      exportedAt: new Date().toISOString(),
      settings,
      entries,
    };

    downloadFile(
      `nails-tech-income-backup-${todayText()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  }

  function exportCsv() {
    const rows = [
      [
        "Date",
        "Service Category",
        "Extra Service Note",
        "Client Name",
        "Payment Method",
        "Service Amount",
        "Tip Amount",
        "Total Received",
        "Notes",
        "Created At",
        "Updated At",
      ],
      ...sortedEntries.map((entry) => [
        entry.date,
        entry.serviceCategory,
        entry.extraServiceNote,
        entry.clientName,
        entry.paymentMethod,
        entry.serviceAmount.toFixed(2),
        entry.tipAmount.toFixed(2),
        entryTotal(entry).toFixed(2),
        entry.notes,
        entry.createdAt,
        entry.updatedAt,
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    downloadFile(
      `nails-tech-income-${todayText()}.csv`,
      csvContent,
      "text/csv;charset=utf-8",
    );
  }

  async function importJsonBackup(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!Array.isArray(backup.entries) || !backup.settings) {
        throw new Error("Invalid backup file.");
      }

      const confirmed = window.confirm(
        "Importing will replace all current app data. Continue?",
      );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      const importedEntries = backup.entries as IncomeEntry[];
      const importedSettings = backup.settings;

      setEntries(importedEntries);
      setSettings(importedSettings);
      replaceAllData(importedEntries, importedSettings);

      alert("Backup imported successfully.");
    } catch {
      alert("Could not import this file. Please choose a valid JSON backup.");
    } finally {
      event.target.value = "";
    }
  }

  function changeBiweeklyStartDate(value: string) {
    const updatedSettings = {
      ...settings,
      biweeklyStartDate: value,
    };

    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  }

  function clearAllEntries() {
    if (entries.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Delete ALL income entries? Download a backup first. This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setEntries([]);
    saveIncomeEntries([]);
    resetForm();
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal Income Tracker</p>
          <h1>Nails Tech Income</h1>
          <p className="eyebrow">Developed by: Long Nguyen</p>
        </div>

        <div className="all-time-total">
          <span>All Income</span>
          <strong>{formatMoney(dashboard.allTime)}</strong>
        </div>
      </header>

      <nav className="tabs" aria-label="Application navigation">
        <button
          className={activeTab === "dashboard" ? "tab active" : "tab"}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>

        <button
          className={activeTab === "history" ? "tab active" : "tab"}
          onClick={() => setActiveTab("history")}
        >
          Income History
        </button>

        <button
          className={activeTab === "settings" ? "tab active" : "tab"}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </nav>

      {activeTab === "dashboard" && (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <span>Today</span>
              <strong>{formatMoney(dashboard.today)}</strong>
            </article>

            <article className="summary-card">
              <span>This Week</span>
              <strong>{formatMoney(dashboard.week)}</strong>
            </article>

            <article className="summary-card">
              <span>Bi-Weekly</span>
              <strong>{formatMoney(dashboard.biweekly)}</strong>
              <small>
                {dateRangeLabel(
                  dashboard.biweeklyStart,
                  dashboard.biweeklyEnd,
                )}
              </small>
            </article>

            <article className="summary-card">
              <span>This Month</span>
              <strong>{formatMoney(dashboard.month)}</strong>
              <small>
                Services: {formatMoney(dashboard.monthServiceIncome)} · Tips:{" "}
                {formatMoney(dashboard.monthTips)}
              </small>
            </article>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {editingId ? "Editing Transaction" : "New Transaction"}
                </p>
                <h2>{editingId ? "Edit Income Entry" : "Add Income"}</h2>
              </div>

              {editingId && (
                <button className="secondary-button" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>

            <form className="income-form" onSubmit={saveIncome}>
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateForm("date", event.target.value)}
                  required
                />
              </label>

              <label>
                Service Category
                <select
                  value={form.serviceCategory}
                  onChange={(event) =>
                    updateForm(
                      "serviceCategory",
                      event.target.value as ServiceCategory,
                    )
                  }
                >
                  {serviceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {form.serviceCategory === "Extra Service" && (
                <label>
                  Extra Service Note
                  <input
                    value={form.extraServiceNote}
                    placeholder="Example: Shave, blowout, scalp massage, styling"
                    onChange={(event) =>
                      updateForm("extraServiceNote", event.target.value)
                    }
                    required
                  />
                </label>
              )}

              <label>
                Service Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.serviceAmount}
                  placeholder="0.00"
                  onChange={(event) =>
                    updateForm("serviceAmount", event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Tip Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tipAmount}
                  placeholder="0.00"
                  onChange={(event) =>
                    updateForm("tipAmount", event.target.value)
                  }
                />
              </label>

              <label>
                Payment Method
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    updateForm(
                      "paymentMethod",
                      event.target.value as PaymentMethod,
                    )
                  }
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Client Name (Optional)
                <input
                  value={form.clientName}
                  placeholder="Client name or initials"
                  onChange={(event) =>
                    updateForm("clientName", event.target.value)
                  }
                />
              </label>

              <label className="wide-field">
                Notes (Optional)
                <input
                  value={form.notes}
                  placeholder="Nails length, color formula, discount, payment split, etc."
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                />
              </label>

              <button className="primary-button wide-field" type="submit">
                {editingId ? "Update Income Entry" : "Save Income Entry"}
              </button>
            </form>
          </section>
        </>
      )}

      {activeTab === "history" && (
        <section className="panel">
          <div className="panel-heading history-heading">
            <div>
              <p className="eyebrow">Saved Transactions</p>
              <h2>Income History</h2>
            </div>

            <div className="history-actions">
              <button className="secondary-button" onClick={exportCsv}>
                Export CSV
              </button>

              <button className="secondary-button" onClick={exportJsonBackup}>
                Download Backup
              </button>
            </div>
          </div>

          <label className="search-box">
            Search income entries
            <input
              value={historySearch}
              placeholder="Search date, service, client, payment method..."
              onChange={(event) => setHistorySearch(event.target.value)}
            />
          </label>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Payment</th>
                  <th>Service</th>
                  <th>Tip</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      No matching income entries.
                    </td>
                  </tr>
                )}

                {visibleEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>
                      <strong>{getServiceDisplayName(entry)}</strong>
                      {entry.notes && (
                        <small className="table-note">{entry.notes}</small>
                      )}
                    </td>
                    <td>{entry.clientName || "-"}</td>
                    <td>{entry.paymentMethod}</td>
                    <td>{formatMoney(entry.serviceAmount)}</td>
                    <td>{formatMoney(entry.tipAmount)}</td>
                    <td className="total-cell">
                      {formatMoney(entryTotal(entry))}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="edit-button"
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="panel settings-panel">
          <div>
            <p className="eyebrow">App Configuration</p>
            <h2>Settings and Backup</h2>
          </div>

          <label>
            Bi-Weekly Period Start Date
            <input
              type="date"
              value={settings.biweeklyStartDate}
              onChange={(event) =>
                changeBiweeklyStartDate(event.target.value)
              }
            />
          </label>

          <p className="help-text">
            Select the first day of your normal 14-day work or pay cycle. The
            Dashboard will use this date for the bi-weekly total.
          </p>

          <div className="settings-actions">
            <button className="secondary-button" onClick={exportJsonBackup}>
              Download JSON Backup
            </button>

            <label className="file-button">
              Import JSON Backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={importJsonBackup}
              />
            </label>

            <button className="danger-button" onClick={clearAllEntries}>
              Delete All Income Entries
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

