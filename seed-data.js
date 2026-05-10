(function () {
  const STORAGE_KEY = "qr_scanner_history";

  const sampleValues = [
    "https://example.com/invoice/1001",
    "https://developer.mozilla.org/en-US/",
    "https://github.com/",
    "WIFI:T:WPA;S:Coffee-Shop;P:coffee123;;",
    "NOT_A_LINK_ABC123",
    "https://openai.com/research/",
    "https://maps.google.com/?q=Paris",
    "mailto:test@example.com",
    "https://localhost:3000/scan-demo",
    "TEXT_SAMPLE_QR_PAYLOAD_01",
  ];

  function buildEntries(sourceValues) {
    const now = Date.now();
    return sourceValues.map((value, idx) => ({
      value,
      time: new Date(now - idx * 60_000).toLocaleString(),
    }));
  }

  function seedData({ replace = false, limit = sampleValues.length } = {}) {
    const useValues = sampleValues.slice(0, Math.min(limit, sampleValues.length));
    const generated = buildEntries(useValues);
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    const merged = replace ? generated : [...generated, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  window.seedQrHistory = function (options) {
    const merged = seedData(options);
    const added = Math.min(
      sampleValues.length,
      options?.limit ?? sampleValues.length
    );

    if (typeof window.render === "function") {
      window.render();
    } else {
      console.warn(
        "render() is not loaded yet. Reload the page to see the seeded history."
      );
    }

    console.info(`[seed] added ${added} test items`);
    return merged;
  };

  console.info(
    "Ready: run `seedQrHistory()` to prepend sample QR/history values."
  );
})();
