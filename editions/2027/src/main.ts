import "./style.css";
import { site, type Person } from "./content";

const { conference: conf, workshop: ws } = site;

const linkCls = "underline decoration-grid underline-offset-4 hover:decoration-signal";
const btn = "inline-flex items-center rounded-md px-5 py-3 font-medium transition-colors";
const primary = `${btn} bg-signal text-white hover:bg-ink`;
const secondary = `${btn} border border-ink/30 hover:border-ink`;

const tba = (text: string) =>
  `<p class="rounded-md border border-dashed border-muted/50 px-4 py-3 text-muted">${text}</p>`;

const section = (id: string, title: string, body: string) => `
  <section id="${id}" class="scroll-mt-14 border-t border-grid">
    <div class="mx-auto grid max-w-5xl gap-6 px-5 py-14 md:grid-cols-[12rem_1fr] md:gap-12">
      <h2 class="font-display text-2xl font-semibold tracking-tight">${title}</h2>
      <div class="max-w-prose space-y-5 text-lg leading-relaxed">${body}</div>
    </div>
  </section>`;

const people = (list: Person[], empty: string) =>
  list.length === 0
    ? tba(empty)
    : `<ul class="grid gap-x-8 gap-y-6 sm:grid-cols-2">${list
        .map(
          (p) => `<li>
            <p class="font-display text-lg font-semibold">${p.url ? `<a class="${linkCls}" href="${p.url}">${p.name}</a>` : p.name}</p>
            <p class="text-muted">${[p.role, p.affiliation].filter(Boolean).join(", ")}</p>
          </li>`,
        )
        .join("")}</ul>`;

const schedule = () =>
  site.schedule.length === 0
    ? tba("The schedule will be posted once sessions are confirmed.")
    : `<ol class="divide-y divide-grid">${site.schedule
        .map(
          (s) => `<li class="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
            <span class="tabular-nums text-muted">${s.time}</span>
            <span><span class="font-semibold">${s.title}</span>${s.detail ? `<span class="block text-muted">${s.detail}</span>` : ""}</span>
          </li>`,
        )
        .join("")}</ol>`;

const deadlines = () =>
  site.deadlines.length === 0
    ? tba("Submission deadlines will be posted here.")
    : `<dl class="divide-y divide-grid">${site.deadlines
        .map(
          (d) =>
            `<div class="flex justify-between gap-4 py-3"><dt>${d.label}</dt><dd class="font-semibold">${d.date}</dd></div>`,
        )
        .join("")}</dl>`;

// Step response of an underdamped second-order system: the classic control-systems plot.
function stepResponse(): string {
  const W = 800,
    H = 280,
    L = 36,
    R = 96,
    T = 20,
    B = 36;
  const zeta = 0.22,
    tMax = 22,
    yMax = 1.6;
  const wd = Math.sqrt(1 - zeta * zeta);
  const y = (t: number) => 1 - Math.exp(-zeta * t) * (Math.cos(wd * t) + (zeta / wd) * Math.sin(wd * t));
  const sx = (t: number) => L + (t / tMax) * (W - L - R);
  const sy = (v: number) => H - B - (v / yMax) * (H - T - B);
  const pts = Array.from({ length: 221 }, (_, i) => `${sx(i / 10).toFixed(1)},${sy(y(i / 10)).toFixed(1)}`);
  const tp = Math.PI / wd;
  return `
  <svg viewBox="0 0 ${W} ${H}" class="mt-10 block w-full" role="img"
       aria-label="Step response of a second-order system: it rises, overshoots the reference, then settles.">
    <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" class="stroke-muted" stroke-width="1.5" />
    <line x1="${L}" y1="${H - B}" x2="${W - R + 30}" y2="${H - B}" class="stroke-muted" stroke-width="1.5" />
    <line x1="${L}" y1="${sy(1)}" x2="${W - R + 10}" y2="${sy(1)}" class="stroke-muted" stroke-width="1.5" stroke-dasharray="6 6" />
    <text x="${W - R + 16}" y="${sy(1) + 5}" class="fill-muted" font-size="15">reference</text>
    <text x="${W - R + 34}" y="${H - B + 5}" class="fill-muted" font-size="15">time</text>
    <path d="M${pts.join(" L")}" pathLength="1" class="curve stroke-signal" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${sx(tp)}" cy="${sy(y(tp))}" r="6" class="fill-peak" />
    <text x="${sx(tp) + 14}" y="${sy(y(tp)) + 5}" class="fill-ink" font-size="15">overshoot</text>
  </svg>`;
}

const nav = [
  ["about", "About"],
  ["submit", "Submit"],
  ["program", "Program"],
  ["speakers", "Speakers"],
  ["organizers", "Organizers"],
];

const fact = (label: string, value: string, note: string) => `
  <div><dt class="text-muted">${label}</dt><dd class="text-xl font-semibold">${value}</dd><dd class="text-muted">${note}</dd></div>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="sticky top-0 z-10 border-b border-grid bg-paper/90 backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-2.5">
      <a href="#top" class="font-display font-bold">${conf.short} RAS Workshop</a>
      <nav aria-label="Sections" class="hidden gap-6 md:flex">
        ${nav.map(([id, label]) => `<a class="text-muted hover:text-ink" href="#${id}">${label}</a>`).join("")}
      </nav>
      <a class="${btn} bg-signal px-4 py-1.5 text-white hover:bg-ink" href="${site.openreview}" target="_blank" rel="noopener">Submit</a>
    </div>
  </header>

  <main>
    <section id="top" class="graph-paper">
      <div class="mx-auto max-w-5xl px-5 pt-14 sm:pt-20">
        <p class="text-lg text-muted"><a class="${linkCls}" href="${conf.url}">${conf.name}</a> workshop</p>
        <h1 class="mt-3 max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">${ws.title}</h1>
        <dl class="mt-10 grid gap-6 sm:grid-cols-3">
          ${fact("Date", ws.date, ws.dateNote)}
          ${fact("Venue", ws.venue, ws.venueNote)}
          ${fact("Format", ws.format, "In person")}
        </dl>
        <div class="mt-10 flex flex-wrap gap-3">
          <a class="${primary}" href="${site.openreview}" target="_blank" rel="noopener">Submit on OpenReview</a>
          <a class="${secondary}" href="#about">About the workshop</a>
        </div>
        ${stepResponse()}
      </div>
    </section>

    ${section(
      "about",
      "About",
      `
      ${site.about.map((p) => `<p>${p}</p>`).join("")}
      <h3 class="pt-2 font-display text-lg font-semibold">Topics of interest</h3>
      <ul class="list-disc space-y-1 pl-5 marker:text-signal">${site.topics.map((t) => `<li>${t}</li>`).join("")}</ul>`,
    )}

    ${section(
      "submit",
      "Submit",
      `
      <p>Student submissions are collected on OpenReview. You will need an OpenReview account to submit.</p>
      ${deadlines()}
      <p><a class="${primary}" href="${site.openreview}" target="_blank" rel="noopener">Open the OpenReview venue</a></p>`,
    )}

    ${section("program", "Program", schedule())}
    ${section("speakers", "Speakers", people(site.speakers, "Invited speakers will be announced here."))}
    ${section("organizers", "Organizers", people(site.organizers, "Organizers will be listed here."))}
  </main>

  <footer class="border-t border-grid">
    <div class="mx-auto flex max-w-5xl flex-wrap justify-between gap-x-8 gap-y-3 px-5 py-8 text-muted">
      <p>${site.email ? `Contact: <a class="${linkCls}" href="mailto:${site.email}">${site.email}</a>` : "Contact details to follow."}</p>
      <p>
        <a class="${linkCls}" href="${conf.url}">${conf.short}</a>,
        <a class="${linkCls}" href="${site.previous.url}">${site.previous.label}</a>
      </p>
    </div>
  </footer>`;
