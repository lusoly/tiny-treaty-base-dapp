import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(new URL("..", import.meta.url).pathname);
const outDir = join(root, "base-submission");
const W = 1284;
const H = 2778;

const c = {
  bg: "#191713",
  paper: "#fffaf0",
  soft: "#f6f1e7",
  ink: "#171717",
  muted: "#7a7469",
  red: "#b91c1c",
  redSoft: "#fee2e2",
  green: "#047857",
};

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function frame(content) {
  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${c.bg}"/>
    <path d="M80 0V2778" stroke="rgba(255,250,240,0.08)" stroke-width="2"/>
    <path d="M1204 0V2778" stroke="rgba(255,250,240,0.08)" stroke-width="2"/>
    ${content}
  </svg>`;
}

function header(title, subtitle) {
  return `
    <text x="72" y="126" font-family="Courier New, monospace" font-size="32" font-weight="900" fill="#cfc7b8">TINY TREATY</text>
    <text x="72" y="228" font-family="Arial, sans-serif" font-size="82" font-weight="900" fill="${c.paper}">${esc(title)}</text>
    <text x="78" y="292" font-family="Arial, sans-serif" font-size="31" font-weight="800" fill="#cfc7b8">${esc(subtitle)}</text>
  `;
}

function info(x, y, w, h, label, lines, fill = c.paper) {
  return `
    <rect x="${x + 8}" y="${y + 8}" width="${w}" height="${h}" rx="4" fill="#000000"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${c.ink}" stroke-width="5"/>
    <text x="${x + 30}" y="${y + 58}" font-family="Courier New, monospace" font-size="22" font-weight="900" fill="${c.muted}">${esc(label)}</text>
    ${lines.map((line, i) => `<text x="${x + 30}" y="${y + 118 + i * 42}" font-family="Arial, sans-serif" font-size="${i === 0 ? 38 : 29}" font-weight="900" fill="${c.ink}">${esc(line)}</text>`).join("")}
  `;
}

function treaty(x, y, title, counterparty, terms, stamp, status = "Pending") {
  const termsLines = wrap(terms, 36).slice(0, 5);
  const statusColor = status === "Accepted" ? c.green : c.red;
  return `
    <rect x="${x + 14}" y="${y + 14}" width="1030" height="850" rx="6" fill="#000000"/>
    <rect x="${x}" y="${y}" width="1030" height="850" rx="6" fill="${c.paper}" stroke="${c.ink}" stroke-width="5"/>
    <rect x="${x + 42}" y="${y + 42}" width="946" height="766" rx="4" fill="${c.paper}" stroke="${c.ink}" stroke-width="3"/>
    <text x="${x + 78}" y="${y + 110}" font-family="Courier New, monospace" font-size="27" font-weight="900" fill="${c.muted}">TINY TREATY</text>
    <text x="${x + 78}" y="${y + 212}" font-family="Arial, sans-serif" font-size="70" font-weight="900" fill="${c.ink}">${esc(title)}</text>
    <circle cx="${x + 856}" cy="${y + 150}" r="78" fill="none" stroke="${c.red}" stroke-width="10"/>
    <text x="${x + 856}" y="${y + 143}" text-anchor="middle" font-family="Courier New, monospace" font-size="22" font-weight="900" fill="${c.red}">${esc(stamp)}</text>
    <text x="${x + 856}" y="${y + 172}" text-anchor="middle" font-family="Courier New, monospace" font-size="19" font-weight="900" fill="${c.red}">ON BASE</text>
    <path d="M${x + 78} ${y + 250}H${x + 952}" stroke="${c.ink}" stroke-width="3"/>
    <text x="${x + 78}" y="${y + 320}" font-family="Courier New, monospace" font-size="23" font-weight="900" fill="${c.muted}">COUNTERPARTY</text>
    <text x="${x + 78}" y="${y + 370}" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="${c.ink}">${esc(counterparty)}</text>
    <rect x="${x + 78}" y="${y + 420}" width="610" height="230" fill="${c.soft}" stroke="${c.ink}" stroke-width="3"/>
    ${termsLines.map((line, i) => `<text x="${x + 110}" y="${y + 482 + i * 38}" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="${c.ink}">${esc(line)}</text>`).join("")}
    <rect x="${x + 728}" y="${y + 420}" width="224" height="230" fill="${c.soft}" stroke="${c.ink}" stroke-width="3"/>
    <text x="${x + 840}" y="${y + 488}" text-anchor="middle" font-family="Courier New, monospace" font-size="20" font-weight="900" fill="${c.muted}">STATUS</text>
    <text x="${x + 840}" y="${y + 552}" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="900" fill="${statusColor}">${esc(status)}</text>
    <path d="M${x + 92} ${y + 728}H${x + 428}" stroke="${c.ink}" stroke-width="3" stroke-dasharray="14 10"/>
    <path d="M${x + 596} ${y + 728}H${x + 932}" stroke="${c.ink}" stroke-width="3" stroke-dasharray="14 10"/>
    <text x="${x + 260}" y="${y + 772}" text-anchor="middle" font-family="Courier New, monospace" font-size="21" font-weight="900" fill="${c.muted}">PROPOSER</text>
    <text x="${x + 764}" y="${y + 772}" text-anchor="middle" font-family="Courier New, monospace" font-size="21" font-weight="900" fill="${c.muted}">SIGNER</text>
  `;
}

function screenshot1() {
  return frame(`
    ${header("Sign small pacts.", "Create a compact two-party agreement with wallet marks on Base.")}
    ${info(72, 370, 548, 230, "CREATE", ["Title, terms, stamp", "One wallet proposes"], c.paper)}
    ${info(664, 370, 548, 230, "ACCEPT", ["Another wallet signs", "Status changes onchain"], c.redSoft)}
    ${treaty(127, 705, "Builder Pact", "Launch partner", "Ship the first useful version, share feedback clearly, and keep the work visible on Base.", "AGREED", "Pending")}
  `);
}

function screenshot2() {
  return frame(`
    ${header("Pending until accepted.", "Treaties show a clear public state before the second wallet signs.")}
    ${treaty(127, 390, "Design Pact", "Studio collaborator", "Deliver two interface directions, decide in public, and keep the final version simple enough to use on mobile.", "PROMISE", "Pending")}
    ${info(72, 1310, 548, 245, "USE CASE", ["Small collaborations", "Event or launch promises"], c.paper)}
    ${info(664, 1310, 548, 245, "VISIBLE", ["Proposer mark", "Signer mark after accept"], c.paper)}
  `);
}

function screenshot3() {
  return frame(`
    ${header("Both sides leave a mark.", "Accepted treaties show signer, proposer, status, and timestamps by ID.")}
    ${treaty(127, 390, "Launch Pact", "Builder team", "Publish the project, test it in Base App, and share one concise update after launch.", "SIGNED", "Accepted")}
    ${info(72, 1310, 548, 245, "LOOKUP", ["Treaty ID 8", "Reload by ID anytime"], c.redSoft)}
    ${info(664, 1310, 548, 245, "BASE RECORD", ["Created and signed", "Wallet marks visible"], c.paper)}
  `);
}

function iconSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${c.bg}"/>
    <rect x="176" y="112" width="672" height="800" rx="18" fill="${c.paper}" stroke="${c.ink}" stroke-width="28"/>
    <text x="250" y="270" font-family="Arial, sans-serif" font-size="92" font-weight="900" fill="${c.ink}">PACT</text>
    <path d="M250 360H760" stroke="${c.ink}" stroke-width="22"/>
    <path d="M250 455H684" stroke="${c.muted}" stroke-width="22"/>
    <path d="M250 540H720" stroke="${c.muted}" stroke-width="22"/>
    <circle cx="670" cy="700" r="106" fill="none" stroke="${c.red}" stroke-width="24"/>
    <text x="670" y="714" text-anchor="middle" font-family="Courier New, monospace" font-size="42" font-weight="900" fill="${c.red}">OK</text>
  </svg>`;
}

function thumbnailSvg() {
  return `
  <svg width="1910" height="1000" viewBox="0 0 1910 1000" xmlns="http://www.w3.org/2000/svg">
    <rect width="1910" height="1000" fill="${c.bg}"/>
    <text x="96" y="158" font-family="Arial, sans-serif" font-size="120" font-weight="900" fill="${c.paper}">Tiny Treaty</text>
    <text x="102" y="232" font-family="Arial, sans-serif" font-size="44" font-weight="800" fill="#cfc7b8">Create and accept small pacts on Base.</text>
    ${treaty(760, 86, "Builder Pact", "Launch partner", "Ship the first useful version and keep the work visible on Base.", "AGREED", "Pending")}
    ${info(96, 354, 560, 220, "ONCHAIN", ["Two-party agreement", "Wallet marks and status"], c.paper)}
  </svg>`;
}

async function writePng(name, svg, width = W, height = H) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg)).resize(width, height).png({ compressionLevel: 9 }).toFile(file);
  return file;
}

async function writeJpg(name, svg, width, height) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg)).resize(width, height).jpeg({ quality: 88, mozjpeg: true }).toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });

const files = [
  await writeJpg("app-icon.jpg", iconSvg(), 1024, 1024),
  await writeJpg("app-thumbnail.jpg", thumbnailSvg(), 1910, 1000),
  await writePng("screenshot-1.png", screenshot1()),
  await writePng("screenshot-2.png", screenshot2()),
  await writePng("screenshot-3.png", screenshot3()),
];

await writeFile(
  join(outDir, "asset-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2),
  "utf8",
);

await writeFile(
  join(outDir, "submission-copy.md"),
  [
    "# Tiny Treaty",
    "",
    "App Name: Tiny Treaty",
    "Tagline: Sign small pacts",
    "Description: Create and accept compact two-party agreements with wallet marks, status, and timestamps on Base.",
    "",
    "Domain: https://tiny-treaty.vercel.app",
    "",
    "Assets:",
    "- app-icon.jpg",
    "- app-thumbnail.jpg",
    "- screenshot-1.png",
    "- screenshot-2.png",
    "- screenshot-3.png",
  ].join("\n"),
  "utf8",
);

for (const file of files) console.log(file);
