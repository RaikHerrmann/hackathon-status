const API = "/api";

async function api(path, opts = {}) {
  const headers = { ...opts.headers };
  if (opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, {
    headers,
    ...opts,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

function statusBadge(status) {
  const labels = { idle: "Idle", done: "Done", "need-help": "Need Help" };
  const safeStatus = ["idle", "done", "need-help"].includes(status) ? status : "idle";
  const label = labels[safeStatus] || "Unknown";
  return `<span class="badge badge-${safeStatus}">${label}</span>`;
}

async function loadRounds(selectEl, includeAll) {
  const rounds = await api("/rounds");
  selectEl.innerHTML = "";
  if (includeAll) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Select Round --";
    selectEl.appendChild(opt);
  }
  rounds.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    selectEl.appendChild(opt);
  });
  return rounds;
}
