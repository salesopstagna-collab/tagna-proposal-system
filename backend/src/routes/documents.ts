import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

export const documentsRouter = Router();
documentsRouter.use(authenticate);

const TEMPLATES_DIR = process.env.TEMPLATES_DIR || path.join(__dirname, '../../templates');

// ── Template resolution ────────────────────────────────────────────────────────

function findTemplate(baseName: string): string | null {
  for (const name of [baseName, `${baseName}.dotm`, baseName.replace('.docx', '.dotm')]) {
    const full = path.join(TEMPLATES_DIR, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getMemoryData(memoryId: string): Promise<any> {
  return prisma.calculationMemory.findUniqueOrThrow({
    where: { id: memoryId },
    include: {
      project: true,
      parameters: true,
      scopeItems: { orderBy: { order: 'asc' } },
      workOrders: {
        include: {
          lines: {
            orderBy: { order: 'asc' },
            include: { professionalRate: true, scopeItem: true },
          },
        },
      },
      dre: true,
      supplies: { orderBy: { order: 'asc' } },
      milestones: { orderBy: { order: 'asc' } },
    },
  });
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function fc(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
}

function fp(v: number): string {
  return `${(v ?? 0).toFixed(2).replace('.', ',')}%`;
}

function x(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ── Section paraId constants ────────────────────────────────────────────────────

const S = {
  OBJETO:         '7F29F83D',
  OBJETIVOS:      '6F712172',
  PRECOS:         '1C842F99',
  INV_GLOBAL:     '55BA9C7A',
  POR_TIPO:       '285A0DDC',
  SERVICOS:       '1DC23A89',
  VIAGEM:         '55335F02',
  PAINEIS:        '33CA40D7',
  EQUIPAMENTOS:   '4779BC63',
  SOFTWARE:       '370BAF74',
  OUTROS:         '7CF08E20',
  SUPERVISAO:     '574B0D7C',
  CERTIFICACAO:   '1CA989A3',
  SERV_TERCEIROS: '74CB3F40',
  FORMA:          '762B5D16',
  FORMA_SERVICOS: '067EF90F',
  FORMA_TAGNA:    '485B2663',
  FORMA_DIRETOS:  '472CBC62',
  FORMA_COND30:   '01F1FE2F',
  DETALHAMENTO:   '11F41C4C',
  CRONOGRAMA:     '40EE39F6',
  TARIFA:         '0E32713B',
  DADOS:          '5011AA9A',
  VALIDADE:       '6B37DD0A',
};

// First paragraph of each tipo's title block inside OBJETO CONTRATUAL
const TIPO_PARA: Record<number, string> = {
  2: '6BE83AFE',
  3: '333FC5C2',
  4: '111440E6',
  5: '5A58772F',
  6: '4FAAE5B7',
  7: '7CFD89C1',
  8: '40FD46EA',
  9: '48034577',
  10: '124F6321',
};
const OBJETO_FINAL_PARA = '629243A6'; // "Para os serviços classificados como Tipo2..."

// Detalhamento tipo block paraIds (Ttulo3 heading of each tax block)
const DETALH_TIPO: Record<number, string> = {
  1:  '3A4BA347',
  2:  '205D8FE8',
  4:  '237B33A1',
  5:  '302D1157',
  6:  '19505A11',
  7:  '386A9A87',
  8:  '708A01C4',
  9:  '3AFE3C01',
  10: '01DD1638',
};

// Supply sections in document order
const SUPPLY_SECS = [
  { id: S.PAINEIS,        next: S.EQUIPAMENTOS,   cat: 'Painéis' },
  { id: S.EQUIPAMENTOS,   next: S.SOFTWARE,        cat: 'Equipamentos' },
  { id: S.SOFTWARE,       next: S.OUTROS,          cat: 'Software' },
  { id: S.OUTROS,         next: S.SUPERVISAO,      cat: 'Outros Materiais' },
  { id: S.SUPERVISAO,     next: S.CERTIFICACAO,    cat: 'Supervisão de Montagem' },
  { id: S.CERTIFICACAO,   next: S.SERV_TERCEIROS,  cat: 'Certificação de Rede' },
  { id: S.SERV_TERCEIROS, next: S.FORMA,           cat: 'Serviços Terceiros' },
];

// ── XML helpers ────────────────────────────────────────────────────────────────

function zGet(zip: PizZip, name: string): string | null {
  return zip.files[name] ? zip.files[name].asText() : null;
}
function zSet(zip: PizZip, name: string, content: string): void {
  zip.file(name, content);
}

function paraStart(xml: string, paraId: string): number {
  const marker = `w14:paraId="${paraId}"`;
  const idx = xml.indexOf(marker);
  if (idx === -1) return -1;
  return xml.lastIndexOf('<w:p ', idx);
}

function paraEnd(xml: string, fromPos: number): number {
  const e = xml.indexOf('</w:p>', fromPos);
  return e === -1 ? -1 : e + 6;
}

function firstExisting(xml: string, ids: string[]): string | null {
  for (const id of ids) {
    if (xml.includes(`w14:paraId="${id}"`)) return id;
  }
  return null;
}

// Remove section from startId (inclusive) to nextId (exclusive).
function removeSection(xml: string, startId: string, nextId: string): string {
  const start = paraStart(xml, startId);
  if (start === -1) return xml;
  const end = paraStart(xml, nextId);
  if (end === -1) return xml;
  return xml.slice(0, start) + xml.slice(end);
}

// ── Fix helpers (same as before) ──────────────────────────────────────────────

function fixContentType(zip: PizZip): void {
  const ct = zGet(zip, '[Content_Types].xml');
  if (!ct) return;
  zSet(zip, '[Content_Types].xml', ct
    .replace(/application\/vnd\.ms-word\.template\.macroEnabledTemplate\.main\+xml/g,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml')
    .replace(/application\/vnd\.ms-word\.document\.macroEnabled\.main\+xml/g,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),
  );
}

function fixSettings(zip: PizZip): void {
  const rels = zGet(zip, 'word/_rels/settings.xml.rels');
  if (rels) zSet(zip, 'word/_rels/settings.xml.rels',
    rels.replace(/<Relationship[^>]*\.dotm[^/]*\/>/g, ''));
  const sx = zGet(zip, 'word/settings.xml');
  if (sx) zSet(zip, 'word/settings.xml',
    sx.replace(/<w:attachedTemplate[^/]*\/>/g, ''));
}

function removeFooterRefs(zip: PizZip): void {
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('word/') || !name.endsWith('.xml')) continue;
    const xml = zGet(zip, name);
    if (!xml) continue;
    const fixed = xml.replace(/<w:footerReference[^/]*\/>/g, '');
    if (fixed !== xml) zSet(zip, name, fixed);
  }
}

function fixParaIds(zip: PizZip): void {
  const doc = zGet(zip, 'word/document.xml');
  if (!doc) return;
  zSet(zip, 'word/document.xml',
    doc.replace(/w14:paraId="([A-F0-9]{8})"/g, (_m, pid) => {
      if (parseInt(pid, 16) >= 0x80000000) {
        const nv = (parseInt(pid, 16) & 0x7FFFFFFF).toString(16).toUpperCase().padStart(8, '0');
        return `w14:paraId="${nv}"`;
      }
      return _m;
    }),
  );
}

function fixBookmarkIds(zip: PizZip): void {
  const doc = zGet(zip, 'word/document.xml');
  if (!doc) return;
  const used = new Set<number>();
  zSet(zip, 'word/document.xml',
    doc.replace(/<w:bookmark(Start|End)([^/]*)\/>/g, (_m, type, attrs) => {
      const m = attrs.match(/w:id="(\d+)"/);
      if (m) {
        let bid = parseInt(m[1]);
        if (used.has(bid)) {
          bid = (used.size ? Math.max(...used) : 0) + 1;
          attrs = attrs.replace(/w:id="\d+"/, `w:id="${bid}"`);
        }
        used.add(bid);
      }
      return `<w:bookmark${type}${attrs}/>`;
    }),
  );
}

function mergeSplitVar(xml: string, varName: string): string {
  let result = xml;
  for (let i = 1; i < varName.length; i++) {
    const prefix = varName.slice(0, i).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const suffix = varName.slice(i).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    let prev = '';
    while (prev !== result) {
      prev = result;
      result = result.replace(
        new RegExp(
          `(<w:t(?:\\s[^>]*)?>)([^<]*${prefix})(<\\/w:t>)([\\s\\S]*?)(<w:t(?:\\s[^>]*)?>)(${suffix}[^<]*)(<\\/w:t>)`,
        ),
        (_m, t1o, p1, t1c, between, t2o, p2, t2c) =>
          `${t1o}${p1}${p2}${t1c}${between}${t2o}${t2c}`,
      );
    }
  }
  return result;
}

function applyVars(zip: PizZip, vars: Record<string, string>): void {
  const varNames = Object.keys(vars);

  let f4 = zGet(zip, 'word/footer4.xml');
  if (f4) {
    for (const v of varNames) f4 = mergeSplitVar(f4, v);
    f4 = f4
      .replace(/<w:t>@EMPRESA<\/w:t>/g, `<w:t>${vars['@EMPRESA']}</w:t>`)
      .replace(/<w:t>@LOCAL<\/w:t>/g, `<w:t>${vars['@LOCAL']}</w:t>`)
      .replace(/<w:t>Template<\/w:t>/g, `<w:t>${vars['@DOCUMENTO']}</w:t>`)
      .replace(
        /<w:t xml:space="preserve"> Proposta Comercial<\/w:t>/g,
        `<w:t xml:space="preserve"> \u2013 ${vars['@EMPRESA']}</w:t>`,
      );
    zSet(zip, 'word/footer4.xml', f4);
  }

  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith('word/') || !name.endsWith('.xml') || name === 'word/footer4.xml') continue;
    let xml = zGet(zip, name);
    if (!xml || !varNames.some(v => xml!.includes(v))) continue;
    for (const v of varNames) xml = mergeSplitVar(xml, v);
    for (const [v, val] of Object.entries(vars)) {
      xml = xml.replace(new RegExp(v.replace('@', '\\@'), 'g'), val);
    }
    zSet(zip, name, xml);
  }
}

function buildVars(memory: any): Record<string, string> {
  const project = memory.project || {};
  return {
    '@DOCUMENTO': project.projectNumber || '',
    '@EMPRESA':   project.clientName    || '',
    '@LOCAL':     'Belo Horizonte',
  };
}

// ── Business logic ─────────────────────────────────────────────────────────────

function determineObjectType(memory: any): number {
  const included = (memory.scopeItems as any[]).filter((s: any) => s.included);
  const hasField  = included.some((s: any) => s.phase === 'IMPLANTAÇÃO DE CAMPO');
  const hasRemote = included.some((s: any) =>
    s.phase === 'DESENVOLVIMENTO DE PROJETO' || s.phase === 'ANÁLISE' || s.phase === 'TESTES DE ACEITAÇÃO',
  );
  if (hasRemote && hasField) return 2;
  if (hasRemote) return 1;
  if (hasField) return 4;
  return 2; // default
}

function checkHasTravel(memory: any): boolean {
  const lines = (memory.workOrders as any[]).flatMap((wo: any) => wo.lines as any[]);
  return lines.some((l: any) => (l.travelPrice ?? 0) > 0);
}

function getSupplyCategories(memory: any): Set<string> {
  return new Set((memory.supplies as any[]).map((s: any) => s.category as string));
}

function allLines(memory: any): any[] {
  return (memory.workOrders as any[]).flatMap((wo: any) => wo.lines as any[]);
}

// ── Table XML builders ─────────────────────────────────────────────────────────

const CW = 9072; // content width in twips

function tcell(
  text: string,
  width: number,
  opts: { header?: boolean; total?: boolean; right?: boolean; shade?: boolean } = {},
): string {
  const dark = opts.header || opts.total;
  const fill  = dark ? '404040' : opts.shade ? 'F2F2F2' : 'FFFFFF';
  const color = dark ? 'FFFFFF' : '000000';
  const bold  = dark ? '<w:b/><w:bCs/>' : '';
  const jc    = opts.right ? 'right' : 'left';
  const fn    = '<w:rFonts w:ascii="Roboto" w:hAnsi="Roboto"/>';
  const rpr   = `${fn}${bold}<w:color w:val="${color}"/><w:sz w:val="18"/><w:szCs w:val="18"/>`;
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>` +
    `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/></w:tcPr>` +
    `<w:p><w:pPr><w:jc w:val="${jc}"/><w:rPr>${rpr}</w:rPr></w:pPr>` +
    `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r></w:p></w:tc>`
  );
}

type Cell = [string, number, ({ header?: boolean; total?: boolean; right?: boolean; shade?: boolean })?];

function trow(cells: Cell[]): string {
  return `<w:tr>${cells.map(([t, w, o]) => tcell(t, w, o ?? {})).join('')}</w:tr>`;
}

function wTable(rows: string[], widths: number[]): string {
  const tw = widths.reduce((a, b) => a + b, 0);
  const grid = widths.map(w => `<w:gridCol w:w="${w}"/>`).join('');
  const borders = '<w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
    '</w:tblBorders>';
  return (
    `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>` +
    `<w:tblW w:w="${tw}" w:type="dxa"/>${borders}</w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>${rows.join('')}</w:tbl><w:p/>`
  );
}

// 3.1 Investimento Global
function buildInvestimentoGlobalTable(
  totalServices: number,
  totalTravel: number,
  totalSupplies: number,
  hasTravel: boolean,
  hasSupplies: boolean,
): string {
  const W = [6000, CW - 6000];
  const rows: string[] = [
    trow([['Composição do Investimento', W[0], { header: true }], ['Valor', W[1], { header: true, right: true }]]),
    trow([['Serviços de Engenharia', W[0]], [fc(totalServices), W[1], { right: true }]]),
  ];
  if (hasTravel) {
    rows.push(trow([['Despesas de Viagem – Nota de Débito', W[0]], [fc(totalTravel), W[1], { right: true }]]));
  }
  if (hasSupplies) {
    rows.push(trow([['Fornecimentos', W[0]], [fc(totalSupplies), W[1], { right: true }]]));
  }
  const total = totalServices + (hasTravel ? totalTravel : 0) + (hasSupplies ? totalSupplies : 0);
  rows.push(trow([['TOTAL GERAL', W[0], { total: true }], [fc(total), W[1], { total: true, right: true }]]));
  return wTable(rows, W);
}

// 3.2 Investimento por Tipo de Fornecimento
function buildPorTipoTable(
  lines: any[],
  supplies: any[],
  hasTravel: boolean,
  hasSupplies: boolean,
): string {
  const W = [6000, CW - 6000];
  const rows: string[] = [
    trow([['Tipo de Fornecimento', W[0], { header: true }], ['Valor', W[1], { header: true, right: true }]]),
  ];

  // Services by phase type
  const FIELD_PHASES = new Set(['IMPLANTAÇÃO DE CAMPO', 'IMPLANTAÇÃO DE CAMPO - REGRAS DE VIAGEM', 'IMPLANTAÇÃO DE CAMPO - REGRAS E DEFINIÇÕES']);
  let remoteTotal = 0, fieldTotal = 0, travelTotal = 0;
  for (const l of lines) {
    const phase: string = l.scopeItem?.phase ?? '';
    if (FIELD_PHASES.has(phase)) {
      fieldTotal += l.laborPrice ?? 0;
      travelTotal += l.travelPrice ?? 0;
    } else {
      remoteTotal += l.laborPrice ?? 0;
    }
  }

  if (remoteTotal > 0) {
    rows.push(trow([['Serviços de Engenharia – Desenvolvimento Remoto', W[0]], [fc(remoteTotal), W[1], { right: true }]]));
  }
  if (fieldTotal > 0) {
    rows.push(trow([['Serviços de Engenharia – Implantação de Campo', W[0]], [fc(fieldTotal), W[1], { right: true }]]));
  }
  if (hasTravel && travelTotal > 0) {
    rows.push(trow([['Despesas de Viagem – Nota de Débito', W[0]], [fc(travelTotal), W[1], { right: true }]]));
  }

  // Supplies by category
  if (hasSupplies) {
    const byCategory: Record<string, number> = {};
    for (const s of supplies) {
      byCategory[s.category] = (byCategory[s.category] ?? 0) + (s.salePrice ?? 0);
    }
    for (const [cat, val] of Object.entries(byCategory)) {
      rows.push(trow([[`Fornecimentos – ${cat}`, W[0]], [fc(val), W[1], { right: true }]]));
    }
  }

  const grandTotal = remoteTotal + fieldTotal + (hasTravel ? travelTotal : 0) +
    (hasSupplies ? supplies.reduce((s: number, i: any) => s + (i.salePrice ?? 0), 0) : 0);
  rows.push(trow([['TOTAL GERAL', W[0], { total: true }], [fc(grandTotal), W[1], { total: true, right: true }]]));
  return wTable(rows, W);
}

// 3.3 Serviços (work order lines)
function buildServicosTable(lines: any[]): string {
  const W = [3200, 2200, 800, 900, CW - 3200 - 2200 - 800 - 900];
  const workLines = lines.filter((l: any) => l.lineType !== 'travel');
  const rows: string[] = [
    trow([
      ['Atividade / Escopo', W[0], { header: true }],
      ['Perfil Profissional', W[1], { header: true }],
      ['Qtd', W[2], { header: true, right: true }],
      ['Horas', W[3], { header: true, right: true }],
      ['Total', W[4], { header: true, right: true }],
    ]),
  ];
  let shade = false;
  for (const l of workLines) {
    const scope  = l.scopeItem?.activity ?? l.scopeItem?.phase ?? '–';
    const perfil = l.professionalRate?.profile ?? '–';
    rows.push(trow([
      [scope, W[0], { shade }],
      [perfil, W[1], { shade }],
      [String(l.quantity ?? 1), W[2], { right: true, shade }],
      [String(l.totalHours ?? 0), W[3], { right: true, shade }],
      [fc(l.laborPrice ?? 0), W[4], { right: true, shade }],
    ]));
    shade = !shade;
  }
  const totalServices = workLines.reduce((s: number, l: any) => s + (l.laborPrice ?? 0), 0);
  rows.push(trow([
    ['TOTAL', W[0], { total: true }],
    ['', W[1], { total: true }],
    ['', W[2], { total: true }],
    ['', W[3], { total: true }],
    [fc(totalServices), W[4], { total: true, right: true }],
  ]));
  return wTable(rows, W);
}

// 3.4 Despesas de Viagem
function buildViagemTable(lines: any[]): string {
  const W = [3500, 1200, 1200, CW - 3500 - 1200 - 1200];
  const travelLines = lines.filter((l: any) => l.lineType === 'travel' || (l.travelPrice ?? 0) > 0);
  const rows: string[] = [
    trow([
      ['Atividade / Escopo', W[0], { header: true }],
      ['Dias', W[1], { header: true, right: true }],
      ['Profissionais', W[2], { header: true, right: true }],
      ['Total', W[3], { header: true, right: true }],
    ]),
  ];
  let shade = false;
  for (const l of travelLines) {
    const scope = l.scopeItem?.activity ?? l.scopeItem?.phase ?? '–';
    rows.push(trow([
      [scope, W[0], { shade }],
      [String(l.travelDays ?? 0), W[1], { right: true, shade }],
      [String(l.travelerCount ?? 1), W[2], { right: true, shade }],
      [fc(l.travelPrice ?? 0), W[3], { right: true, shade }],
    ]));
    shade = !shade;
  }
  const totalTravel = travelLines.reduce((s: number, l: any) => s + (l.travelPrice ?? 0), 0);
  rows.push(trow([
    ['TOTAL', W[0], { total: true }],
    ['', W[1], { total: true }],
    ['', W[2], { total: true }],
    [fc(totalTravel), W[3], { total: true, right: true }],
  ]));
  return wTable(rows, W);
}

// 3.5–3.11 Fornecimentos (by category)
function buildSupplyTable(supplies: any[], category: string): string {
  const W = [3200, 800, 800, 2000, CW - 3200 - 800 - 800 - 2000];
  const items = supplies.filter((s: any) => s.category === category);
  const rows: string[] = [
    trow([
      ['Descrição', W[0], { header: true }],
      ['Und', W[1], { header: true }],
      ['Qtd', W[2], { header: true, right: true }],
      ['Preço Unit.', W[3], { header: true, right: true }],
      ['Total', W[4], { header: true, right: true }],
    ]),
  ];
  let shade = false;
  for (const s of items) {
    rows.push(trow([
      [s.description ?? '', W[0], { shade }],
      [s.unit ?? 'un', W[1], { shade }],
      [String(s.quantity ?? 1), W[2], { right: true, shade }],
      [fc(s.unitCost ?? 0), W[3], { right: true, shade }],
      [fc(s.salePrice ?? 0), W[4], { right: true, shade }],
    ]));
    shade = !shade;
  }
  const total = items.reduce((s: number, i: any) => s + (i.salePrice ?? 0), 0);
  rows.push(trow([
    ['TOTAL', W[0], { total: true }],
    ['', W[1], { total: true }],
    ['', W[2], { total: true }],
    ['', W[3], { total: true }],
    [fc(total), W[4], { total: true, right: true }],
  ]));
  return wTable(rows, W);
}

// 4.1 / 6 Cronograma de Desembolso
function buildDisbursementTable(
  milestones: any[],
  totalServices: number,
  totalTravel: number,
  totalSupplies: number,
  hasTravel: boolean,
  hasSupplies: boolean,
): string {
  const W = [3200, 1200, 1200, CW - 3200 - 1200 - 1200];
  const rows: string[] = [
    trow([
      ['Marco / Atividade', W[0], { header: true }],
      ['Previsão', W[1], { header: true }],
      ['% Faturamento', W[2], { header: true, right: true }],
      ['Valor Estimado', W[3], { header: true, right: true }],
    ]),
  ];
  const grandTotal = totalServices + (hasTravel ? totalTravel : 0) + (hasSupplies ? totalSupplies : 0);
  let shade = false;
  for (const ms of milestones) {
    const value = grandTotal * (ms.paymentPct / 100);
    rows.push(trow([
      [ms.name ?? '', W[0], { shade }],
      [ms.dueDate ?? '', W[1], { shade }],
      [fp(ms.paymentPct ?? 0), W[2], { right: true, shade }],
      [fc(value), W[3], { right: true, shade }],
    ]));
    shade = !shade;
  }
  const totalPct = milestones.reduce((s: number, m: any) => s + (m.paymentPct ?? 0), 0);
  rows.push(trow([
    ['TOTAL', W[0], { total: true }],
    ['', W[1], { total: true }],
    [fp(totalPct), W[2], { total: true, right: true }],
    [fc(grandTotal), W[3], { total: true, right: true }],
  ]));
  return wTable(rows, W);
}

// 7. Tarifa para Serviços Adicionais
function buildTarifaTable(proRates: any[], travelRates: any[]): string {
  const W = [4800, 1200, CW - 4800 - 1200];
  const rows: string[] = [
    trow([
      ['Perfil / Item', W[0], { header: true }],
      ['Unidade', W[1], { header: true }],
      ['Valor Unitário', W[2], { header: true, right: true }],
    ]),
  ];
  let shade = false;
  for (const r of proRates) {
    rows.push(trow([
      [r.profile ?? '', W[0], { shade }],
      ['Hora', W[1], { shade }],
      [fc(r.salePrice ?? 0), W[2], { right: true, shade }],
    ]));
    shade = !shade;
  }
  for (const r of travelRates) {
    rows.push(trow([
      [r.label ?? r.type ?? '', W[0], { shade }],
      [r.unit ?? 'un', W[1], { shade }],
      [fc(r.salePrice ?? 0), W[2], { right: true, shade }],
    ]));
    shade = !shade;
  }
  return wTable(rows, W);
}

// ── Section manipulation ───────────────────────────────────────────────────────

// Replace paragraph containing a placeholder text with tableXml.
// Searches within sectionId → nextSectionId range.
function replacePlaceholder(
  xml: string,
  sectionId: string,
  nextId: string | null,
  tableXml: string,
  placeholder: string,
): string {
  const secStart = paraStart(xml, sectionId);
  if (secStart === -1) return xml;

  const secEnd = nextId ? paraStart(xml, nextId) : -1;
  let section = secEnd !== -1 ? xml.slice(secStart, secEnd) : xml.slice(secStart);

  section = mergeSplitVar(section, placeholder);

  const markers = [`<w:t>${placeholder}</w:t>`, `<w:t xml:space="preserve">${placeholder}</w:t>`];
  let mIdx = -1;
  for (const m of markers) {
    mIdx = section.indexOf(m);
    if (mIdx !== -1) break;
  }
  if (mIdx === -1) return xml;

  const pStart = section.lastIndexOf('<w:p ', mIdx);
  const pEnd = section.indexOf('</w:p>', mIdx) + 6;
  const newSection = section.slice(0, pStart) + tableXml + section.slice(pEnd);

  if (secEnd !== -1) {
    return xml.slice(0, secStart) + newSection + xml.slice(secEnd);
  }
  return xml.slice(0, secStart) + newSection;
}

// Insert tableXml immediately after the heading paragraph of sectionId.
function insertAfterHeading(xml: string, sectionId: string, tableXml: string): string {
  const pStart = paraStart(xml, sectionId);
  if (pStart === -1) return xml;
  const pEnd = paraEnd(xml, pStart);
  if (pEnd === -1) return xml;
  return xml.slice(0, pEnd) + tableXml + xml.slice(pEnd);
}

// Select only one tipo block in OBJETO CONTRATUAL, remove instruction text.
function selectObjetoTipo(xml: string, tipo: number): string {
  const objS = paraStart(xml, S.OBJETO);
  const objE = paraStart(xml, S.OBJETIVOS);
  if (objS === -1 || objE === -1) return xml;

  const section = xml.slice(objS, objE);

  // Heading paragraph (keep)
  const headingEnd = paraEnd(section, 0);

  // Final "Para os serviços..." paragraph (keep everything from here to section end)
  const finalPos = paraStart(section, OBJETO_FINAL_PARA);

  // Determine selected tipo block boundaries
  let tipoStart: number, tipoEnd: number;
  const tipoKeys = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  if (tipo === 1) {
    // Tipo 1 paragraphs have no stable paraId — they follow the instruction para
    const instrText = 'Escolher o tipo que se encaixa';
    const instrIdx = section.indexOf(instrText);
    if (instrIdx === -1) {
      tipoStart = headingEnd;
    } else {
      tipoStart = paraEnd(section, instrIdx);
      if (tipoStart === -1) tipoStart = headingEnd;
    }
    const tipo2Pos = paraStart(section, TIPO_PARA[2]);
    tipoEnd = tipo2Pos !== -1 ? tipo2Pos : (finalPos !== -1 ? finalPos : section.length);
  } else {
    const tipoId = TIPO_PARA[tipo];
    tipoStart = tipoId ? paraStart(section, tipoId) : -1;
    if (tipoStart === -1) tipoStart = headingEnd; // fallback

    const idx = tipoKeys.indexOf(tipo);
    tipoEnd = finalPos !== -1 ? finalPos : section.length;
    for (let i = idx + 1; i < tipoKeys.length; i++) {
      const nextPos = paraStart(section, TIPO_PARA[tipoKeys[i]]);
      if (nextPos !== -1) { tipoEnd = nextPos; break; }
    }
  }

  const heading   = section.slice(0, headingEnd);
  const tipoBlock = section.slice(tipoStart, tipoEnd);
  const finalBlock = finalPos !== -1 ? section.slice(finalPos) : '';

  const newSection = heading + tipoBlock + finalBlock;
  return xml.slice(0, objS) + newSection + xml.slice(objE);
}

// Keep only the matching tipo block in DETALHAMENTO SOBRE IMPOSTOS.
function selectDetalhamentoTipo(xml: string, tipo: number): string {
  const detS = paraStart(xml, S.DETALHAMENTO);
  const cronS = paraStart(xml, S.CRONOGRAMA);
  if (detS === -1 || cronS === -1) return xml;

  const section = xml.slice(detS, cronS);

  const tipoNums = [1, 2, 4, 5, 6, 7, 8, 9, 10];
  const blockPositions: Array<{ pos: number; num: number }> = [];
  for (const n of tipoNums) {
    const id = DETALH_TIPO[n];
    if (!id) continue;
    const pos = paraStart(section, id);
    if (pos !== -1) blockPositions.push({ pos, num: n });
  }
  blockPositions.sort((a, b) => a.pos - b.pos);

  if (blockPositions.length === 0) return xml;

  // Fallback: if selected tipo not in detalhamento (e.g. tipo 3), use tipo 2
  const targetNum = DETALH_TIPO[tipo] ? tipo : 2;
  const selIdx = blockPositions.findIndex(b => b.num === targetNum);
  const useIdx = selIdx !== -1 ? selIdx : blockPositions.findIndex(b => b.num === 2);
  if (useIdx === -1) return xml;

  const preamble = section.slice(0, blockPositions[0].pos);
  const selStart = blockPositions[useIdx].pos;
  const selEnd   = useIdx + 1 < blockPositions.length
    ? blockPositions[useIdx + 1].pos
    : section.length;
  const selBlock = section.slice(selStart, selEnd);

  return xml.slice(0, detS) + preamble + selBlock + xml.slice(cronS);
}

// ── Main document builder ──────────────────────────────────────────────────────

function buildDocument(
  zip: PizZip,
  memory: any,
  proRates: any[],
  travelRates: any[],
): void {
  let doc = zGet(zip, 'word/document.xml');
  if (!doc) return;

  const tipo         = determineObjectType(memory);
  const hasTravel    = checkHasTravel(memory);
  const supCats      = getSupplyCategories(memory);
  const hasSupplies  = memory.supplies.length > 0;
  const lines        = allLines(memory);
  const params       = memory.parameters || {};

  // Pre-compute totals
  const workLines    = lines.filter((l: any) => l.lineType !== 'travel');
  const totalSvc     = workLines.reduce((s: number, l: any) => s + (l.laborPrice ?? 0), 0);
  const totalTravel  = lines.reduce((s: number, l: any) => s + (l.travelPrice ?? 0), 0);
  const totalSupp    = (memory.supplies as any[]).reduce((s: number, i: any) => s + (i.salePrice ?? 0), 0);

  // ── 1. Select Objeto Contratual tipo ──────────────────────────────────────
  doc = selectObjetoTipo(doc, tipo);

  // ── 2. Remove conditional sections ────────────────────────────────────────
  // 3.4 Despesas de Viagem
  if (!hasTravel) {
    const nextIds = [...SUPPLY_SECS.map(s => s.id), S.FORMA];
    const nextViagem = firstExisting(doc, nextIds) ?? S.FORMA;
    doc = removeSection(doc, S.VIAGEM, nextViagem);
  }

  // 3.5–3.11 Supply sections (remove back-to-front so later sections exist as anchors)
  for (let i = SUPPLY_SECS.length - 1; i >= 0; i--) {
    const sec = SUPPLY_SECS[i];
    if (!supCats.has(sec.cat)) {
      const laterIds = [...SUPPLY_SECS.slice(i + 1).map(s => s.id), S.FORMA];
      const nextSec = firstExisting(doc, laterIds) ?? S.FORMA;
      doc = removeSection(doc, sec.id, nextSec);
    }
  }

  // 4.2 Fornecimentos via TAGNA, 4.3 Fornecimentos Diretos (remove if no supplies)
  if (!hasSupplies) {
    const nextTagna = firstExisting(doc, [S.FORMA_DIRETOS, S.FORMA_COND30, S.DETALHAMENTO]) ?? S.DETALHAMENTO;
    doc = removeSection(doc, S.FORMA_TAGNA, nextTagna);
    const nextDiretos = firstExisting(doc, [S.FORMA_COND30, S.DETALHAMENTO]) ?? S.DETALHAMENTO;
    doc = removeSection(doc, S.FORMA_DIRETOS, nextDiretos);
  }

  // ── 3. Select Detalhamento tipo block ─────────────────────────────────────
  doc = selectDetalhamentoTipo(doc, tipo);

  // ── 4. Replace table placeholders with data ────────────────────────────────
  // 3.1 Investimento Global
  doc = replacePlaceholder(doc, S.INV_GLOBAL, S.POR_TIPO,
    buildInvestimentoGlobalTable(totalSvc, totalTravel, totalSupp, hasTravel, hasSupplies),
    '***TABELA***');

  // 3.2 Investimento por Tipo
  doc = replacePlaceholder(doc, S.POR_TIPO, S.SERVICOS,
    buildPorTipoTable(lines, memory.supplies, hasTravel, hasSupplies),
    '***TABELA***');

  // 3.3 Serviços
  const nextAfterServicos = firstExisting(doc, [S.VIAGEM, ...SUPPLY_SECS.map(s => s.id), S.FORMA]);
  doc = replacePlaceholder(doc, S.SERVICOS, nextAfterServicos,
    buildServicosTable(lines),
    '***TABELA***');

  // 3.4 Despesas de Viagem (only if not removed)
  if (hasTravel) {
    const nextViagem2 = firstExisting(doc, [...SUPPLY_SECS.map(s => s.id), S.FORMA]);
    doc = replacePlaceholder(doc, S.VIAGEM, nextViagem2,
      buildViagemTable(lines),
      '***TABELA***');
  }

  // 3.5–3.11 Supply section tables
  for (let i = 0; i < SUPPLY_SECS.length; i++) {
    const sec = SUPPLY_SECS[i];
    if (!supCats.has(sec.cat)) continue;
    const nextId = firstExisting(doc, [...SUPPLY_SECS.slice(i + 1).map(s => s.id), S.FORMA]);
    doc = replacePlaceholder(doc, sec.id, nextId,
      buildSupplyTable(memory.supplies, sec.cat),
      '***TABELA***');
  }

  // 4.1 Forma de Pagamento – Serviços (bare TABELA marker)
  const disbTable = buildDisbursementTable(
    memory.milestones, totalSvc, totalTravel, totalSupp, hasTravel, hasSupplies,
  );
  doc = replacePlaceholder(doc, S.FORMA_SERVICOS,
    firstExisting(doc, [S.FORMA_TAGNA, S.FORMA_DIRETOS, S.FORMA_COND30, S.DETALHAMENTO]),
    disbTable, 'TABELA');

  // 6. Cronograma de Desembolso (no placeholder – insert after heading)
  const cronTable = buildDisbursementTable(
    memory.milestones, totalSvc, totalTravel, totalSupp, hasTravel, hasSupplies,
  );
  doc = insertAfterHeading(doc, S.CRONOGRAMA, cronTable);

  // 7. Tarifa para Serviços Adicionais ([TABELA] marker)
  doc = replacePlaceholder(doc, S.TARIFA, S.DADOS,
    buildTarifaTable(proRates, travelRates),
    '[TABELA]');

  zSet(zip, 'word/document.xml', doc);
}

// ── Main render ────────────────────────────────────────────────────────────────

async function renderDocument(
  templatePath: string,
  memory: any,
  proRates: any[],
  travelRates: any[],
): Promise<Buffer> {
  const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));

  fixContentType(zip);
  fixSettings(zip);

  const vars = buildVars(memory);
  applyVars(zip, vars);

  buildDocument(zip, memory, proRates, travelRates);

  removeFooterRefs(zip);
  fixParaIds(zip);
  fixBookmarkIds(zip);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

documentsRouter.post(
  '/:projectId/memories/:memoryId/documents/commercial',
  authorize('admin', 'sales_engineer', 'commercial'),
  async (req: AuthRequest, res: Response) => {
    try {
      const [memory, proRates, travelRates] = await Promise.all([
        getMemoryData(req.params.memoryId),
        prisma.professionalRate.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        prisma.travelRate.findMany({ where: { active: true }, orderBy: { type: 'asc' } }),
      ]);

      const tpl = findTemplate('Template Proposta Comercial.docx');
      if (!tpl) return res.status(404).json({ error: `Template não encontrado em: ${TEMPLATES_DIR}` });

      const buf = await renderDocument(tpl, memory, proRates, travelRates);
      const fn  = `Proposta_Comercial_${memory.project?.projectNumber || memory.projectId}_${memory.label}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
      return res.send(buf);
    } catch (e: any) {
      console.error('[documents/commercial]', e);
      return res.status(500).json({ error: e?.message || String(e) });
    }
  },
);

documentsRouter.post(
  '/:projectId/memories/:memoryId/documents/technical',
  authorize('admin', 'sales_engineer', 'commercial'),
  async (req: AuthRequest, res: Response) => {
    try {
      const [memory, proRates, travelRates] = await Promise.all([
        getMemoryData(req.params.memoryId),
        prisma.professionalRate.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
        prisma.travelRate.findMany({ where: { active: true }, orderBy: { type: 'asc' } }),
      ]);

      const tpl = findTemplate('Template Proposta Técnica.docx');
      if (!tpl) return res.status(404).json({ error: `Template não encontrado em: ${TEMPLATES_DIR}` });

      const buf = await renderDocument(tpl, memory, proRates, travelRates);
      const fn  = `Proposta_Tecnica_${memory.project?.projectNumber || memory.projectId}_${memory.label}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
      return res.send(buf);
    } catch (e: any) {
      console.error('[documents/technical]', e);
      return res.status(500).json({ error: e?.message || String(e) });
    }
  },
);
