import "./style.css";
import { site, type Person } from "./content";
import { startLidar } from './lidar';

const { conference: conf, workshop: ws } = site;

const linkCls = "underline decoration-grid underline-offset-4 hover:decoration-signal";
const btn = "inline-flex items-center rounded-md px-5 py-3 font-medium transition-colors";
const primary = `${btn} bg-signal text-white hover:bg-ink`;
const secondary = `${btn} border border-ink/30 hover:border-ink`;

const tba = (text: string) =>
  `<p class="rounded-md border border-dashed border-muted/50 px-4 py-3 text-muted">${text}</p>`;

const section = (id: string, title: string, body: string) => `
  <section id="${id}" class="scroll-mt-14 border-t border-grid">
    <div class="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <h2 class="font-display text-4xl font-bold tracking-tight sm:text-5xl">${title}</h2>
      <div class="mt-8 space-y-5 text-lg leading-relaxed sm:mt-12">${body}</div>
    </div>
  </section>`;

const people = (list: Person[], empty: string) =>
  list.length === 0
    ? tba(empty)
    : `<ul class="grid gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-3">${list
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
    ? `<p class="rounded-md border border-dashed border-paper/30 px-4 py-3 text-paper/70">Submission deadlines will be posted here.</p>`
    : `<dl class="divide-y divide-paper/20">${site.deadlines
      .map((d) => `<div class="flex justify-between gap-4 py-3"><dt class="text-paper/80">${d.label}</dt><dd class="font-semibold">${d.date}</dd></div>`)
      .join('')}</dl>`;

const submitBand = () => `
  <section id="submit" class="on-ink scroll-mt-14 bg-ink text-paper">
    <div class="mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:py-24 md:grid-cols-[1fr_20rem] md:items-end md:gap-16">
      <div>
        <h2 class="font-display text-5xl font-bold tracking-tight sm:text-6xl">Submit your work</h2>
        <p class="mt-6 max-w-prose text-lg leading-relaxed text-paper/80">Student submissions are collected on OpenReview. You will need an OpenReview account to submit.</p>
        <a class="${btn} mt-8 bg-paper text-ink hover:bg-grid" href="${site.openreview}" target="_blank" rel="noopener">Open the OpenReview venue</a>
      </div>
      <div>${deadlines()}</div>
    </div>
  </section>`;

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
    <section id="top" class="relative overflow-hidden">
      <canvas id="scan" aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
      <div class="relative mx-auto max-w-5xl px-5 pb-14 pt-14 sm:pb-20 sm:pt-20">
        <p class="text-lg text-muted"><a class="${linkCls}" href="${conf.url}">${conf.name}</a> workshop</p>
        <h1 id="title" class="mt-3 max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">${ws.title.split(' ').map((w) => `<span class="word">${w}</span>`).join(' ')}</h1>
        <dl class="mt-10 grid gap-6 sm:grid-cols-3">
          ${fact("Date", ws.date, ws.dateNote)}
          ${fact("Venue", ws.venue, ws.venueNote)}
          ${fact("Format", ws.format, "In person")}
        </dl>
        <div class="mt-10 flex flex-wrap gap-3">
          <a class="${primary}" href="${site.openreview}" target="_blank" rel="noopener">Submit on OpenReview</a>
          <a class="${secondary}" href="#about">About the workshop</a>
        </div>
      </div>
    </section>

    ${section('about', 'About', `
      <div class="grid gap-10 md:grid-cols-2 md:gap-16">
        <div class="space-y-5">${site.about.map((p) => `<p>${p}</p>`).join('')}</div>
        <div>
          <h3 class="font-display text-lg font-semibold">Topics of interest</h3>
          <ul class="mt-3 list-disc space-y-1 pl-5 marker:text-signal">${site.topics.map((t) => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>`)}

    ${submitBand()}

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

startLidar(
  document.querySelector<HTMLElement>('#top')!,
  document.querySelector<HTMLCanvasElement>('#scan')!,
  document.querySelector<HTMLElement>('#title')!,
);