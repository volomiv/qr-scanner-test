let stream = null;
let scanning = false;
let detector = null;
let latestValue = "";

const STORAGE_KEY = "qr_scanner_history";

const video = document.getElementById("video");
const scanner = document.getElementById("scanner");
const historyEl = document.getElementById("history");
const latestEl = document.getElementById("latest");
const status = document.getElementById("status");
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const exportButton = document.getElementById("export-json");

function setStatus(msg) {
  status.textContent = msg;
}

function isLink(v) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

function openLink(v) {
  if (!isLink(v)) {
    setStatus("Not a link");
    return;
  }
  window.open(v, "_blank");
}

function copyText(v) {
  if (!v) return;
  navigator.clipboard.writeText(v);
  setStatus("Copied ✔");
}

function getHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveHistory(h) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
}

function addToHistory(value) {
  const h = getHistory();
  const now = new Date();
  h.unshift({ value, time: now.toLocaleString() });
  saveHistory(h);
  render();
}

function exportHistoryAsJson() {
  const h = getHistory();
  const payload = h.map((item) => ({ value: item.value, time: item.time }));

  if (!payload.length) {
    setStatus("No scanned data to export");
    return;
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `qr-scan-history-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatus("JSON exported ✔");
}

function createSwipeItem(html, value) {
  const wrap = document.createElement("div");
  wrap.className = "swipe-wrap";

  const btn = document.createElement("div");
  btn.className = "swipe-btn";
  btn.textContent = "Open";
  btn.onclick = () => openLink(value);

  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = html;
  item.onclick = () => copyText(value);

  let startX = 0;
  let currentX = 0;

  item.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  item.addEventListener("touchmove", e => {
    currentX = e.touches[0].clientX;
    let dx = currentX - startX;

    if (dx < 0) {
      item.style.transform = `translateX(${Math.max(dx, -120)}px)`;
    }
  });

  item.addEventListener("touchend", () => {
    let dx = currentX - startX;

    if (dx < -80 && isLink(value)) {
      item.style.transform = "translateX(-120px)";
    } else {
      item.style.transform = "translateX(0)";
      if (dx < -80) setStatus("Not a link");
    }
  });

  wrap.appendChild(btn);
  wrap.appendChild(item);

  return wrap;
}

function render() {
  const h = getHistory();

  historyEl.innerHTML = "";
  latestEl.innerHTML = "";

  if (latestValue) {
    const latest = createSwipeItem(latestValue, latestValue);
    latestEl.appendChild(latest);
  }

  h.forEach(i => {
    const el = createSwipeItem(
      `<div class="history-time">${i.time}</div>${i.value}`,
      i.value
    );
    historyEl.appendChild(el);
  });
}

async function startScan() {
  try {
    if (!("BarcodeDetector" in window)) {
      setStatus("Not supported");
      startButton.disabled = false;
      stopButton.disabled = true;
      return;
    }

    const formats = await BarcodeDetector.getSupportedFormats();
    if (!formats.includes("qr_code")) {
      setStatus("QR not supported");
      startButton.disabled = false;
      stopButton.disabled = true;
      return;
    }

    detector = new BarcodeDetector({ formats: ["qr_code"] });

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = stream;
    scanner.style.display = "block";
    await video.play();

    scanning = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    setStatus("Scanning...");

    scanLoop();
  } catch (e) {
    setStatus("Camera error");
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}

function stopCamera(msg="Stopped") {
  scanning = false;

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.pause();
  video.srcObject = null;

  scanner.style.display = "none";
  startButton.disabled = false;
  stopButton.disabled = true;
  setStatus(msg);
}

async function scanLoop() {
  if (!scanning) return;

  const codes = await detector.detect(video);

  if (codes.length > 0) {
    const v = codes[0].rawValue;
    latestValue = v;

    addToHistory(v);
    stopCamera("QR detected ✔");
    return;
  }

  requestAnimationFrame(scanLoop);
}

startButton.onclick = startScan;
stopButton.onclick = () => stopCamera();
document.getElementById("copy").onclick = () => copyText(latestValue);
exportButton.onclick = exportHistoryAsJson;

document.getElementById("clear").onclick = () => {
  if (!window.confirm("Delete all scanned items?")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  latestValue = "";
  render();
};

render();
