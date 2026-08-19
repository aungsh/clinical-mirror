import 'server-only';

import type { AdminSessionDetail } from '@/lib/database.server';

type PdfLine = { text: string; size: number; bold?: boolean; gapAfter?: number; block: number };

export function createSessionReportPdf(session: AdminSessionDetail, view: 'learner' | 'admin'): Uint8Array {
  const lines: PdfLine[] = [];
  const title = view === 'admin' ? 'ClinicalMirror - Admin Evidence Report' : 'ClinicalMirror - Learning Review';
  heading(lines, title, 18);
  paragraph(lines, `${session.userName} | ${session.scenarioTitle} | Attempt ${session.attemptNumber}`);
  paragraph(lines, `Completed ${new Date(session.endedAt).toLocaleString('en-SG')} | Duration ${Math.max(1, Math.round(session.durationSeconds / 60))} minutes`);

  if (view === 'learner') addLearnerReport(lines, session);
  else addAdminReport(lines, session);

  return buildPdf(lines, title);
}

function addLearnerReport(lines: PdfLine[], session: AdminSessionDetail) {
  const report = session.learnerFeedback;
  heading(lines, report.headline, 15);
  paragraph(lines, report.summary);
  heading(lines, 'Rubric snapshot', 13);
  report.rubricSnapshot.forEach((item) => bullet(lines, `${item.label}: ${item.score}/10 - ${item.descriptor}`));
  heading(lines, 'What worked', 13);
  if (!report.strengths.length) paragraph(lines, 'The transcript did not provide enough evidence for a reliable strength yet.');
  report.strengths.forEach((item) => bullet(lines, `Turn ${item.turn}: "${item.moment}" - ${item.observation}`));
  heading(lines, 'Priorities to improve', 13);
  report.priorities.forEach((item) => {
    bullet(lines, `Turn ${item.turn}: "${item.moment}"`);
    paragraph(lines, `Why it matters: ${item.whyItMatters}`);
    paragraph(lines, `Try instead: ${item.tryInstead}`);
  });
  heading(lines, 'Next attempt plan', 13);
  report.nextAttemptPlan.forEach((item, index) => bullet(lines, `${index + 1}. ${item}`));
  if (report.progress) {
    heading(lines, `Progress since attempt ${report.progress.previousAttemptNumber}`, 13);
    paragraph(lines, `Improved indicators: ${report.progress.improved.join(', ') || 'No clear change yet'}`);
    paragraph(lines, `Priority indicators: ${report.progress.declined.join(', ') || 'No clear change yet'}`);
    paragraph(lines, report.progress.note);
  }
  heading(lines, 'Important limitation', 13);
  paragraph(lines, report.educationalDisclaimer);
}

function addAdminReport(lines: PdfLine[], session: AdminSessionDetail) {
  const report = session.adminEvaluation;
  heading(lines, 'Factual summary', 13);
  paragraph(lines, report.factualSummary);
  heading(lines, 'Detailed rubric', 13);
  const overrides = new Map(session.review?.overrides.map((item) => [item.rubricId, item]) ?? []);
  report.rubrics.forEach((rubric) => {
    const rubricBlock = nextBlock(lines);
    const override = overrides.get(rubric.id);
    bullet(lines, `${rubric.label}: ${rubric.score}/10 automated${override ? `; ${override.score}/10 human override` : ''} (${rubric.confidence} confidence)`, rubricBlock);
    paragraph(lines, rubric.rationale, rubricBlock);
    if (override) paragraph(lines, `Human rationale: ${override.rationale}`, rubricBlock);
    rubric.evidence.forEach((item) => paragraph(lines, `Turn ${item.turn}: "${item.moment}" - ${item.observation}`, rubricBlock));
  });
  heading(lines, 'Delivery observations', 13);
  paragraph(lines, report.delivery.interpretation);
  paragraph(lines, `Words: ${report.delivery.learnerWordCount}; average words/turn: ${report.delivery.averageWordsPerTurn}; speaking share: ${report.delivery.speakingSharePercent}%; questions: ${report.delivery.questionCount}; fillers: ${report.delivery.fillerCount}; hedges: ${report.delivery.hedgingCount}; profanity: ${report.delivery.profanityCount}; possible overlaps: ${report.delivery.interruptions}.`);
  if (report.flags.length) {
    heading(lines, 'Human-review flags', 13);
    report.flags.forEach((item) => bullet(lines, `${item.label}: ${item.evidence}`));
  }
  heading(lines, 'Scenario goals', 13);
  report.goalCompletion.forEach((item) => bullet(lines, `${item.status.toUpperCase()} - ${item.goal}: ${item.evidence}`));
  heading(lines, 'Coaching plan', 13);
  report.coachingPlan.forEach((item, index) => bullet(lines, `${index + 1}. ${item}`));
  if (session.review) {
    heading(lines, 'Human reviewer notes', 13);
    paragraph(lines, `${session.review.reviewerName}, ${new Date(session.review.updatedAt).toLocaleString('en-SG')}`);
    paragraph(lines, session.review.notes || 'No general notes entered.');
  }
  heading(lines, 'Transcript', 13);
  let learnerTurn = 0;
  session.turns.forEach((turn) => {
    if (turn.speaker === 'student') learnerTurn += 1;
    paragraph(lines, `${turn.speaker === 'student' ? `Learner turn ${learnerTurn}` : 'Simulation'}: ${turn.text}`);
  });
  heading(lines, `Limitations - ${report.overallConfidence} confidence`, 13);
  report.limitations.forEach((item) => bullet(lines, item));
  paragraph(lines, report.educationalDisclaimer);
}

function heading(lines: PdfLine[], text: string, size: number) { lines.push({ text, size, bold: true, gapAfter: 6, block: nextBlock(lines) }); }
function paragraph(lines: PdfLine[], text: string, block = nextBlock(lines)) { wrap(text, 96).forEach((part, index, all) => lines.push({ text: part, size: 10, gapAfter: index === all.length - 1 ? 6 : 1, block })); }
function bullet(lines: PdfLine[], text: string, block = nextBlock(lines)) { const wrapped = wrap(text, 92); wrapped.forEach((part, index, all) => lines.push({ text: `${index === 0 ? '- ' : '  '}${part}`, size: 10, gapAfter: index === all.length - 1 ? 4 : 1, block })); }
function nextBlock(lines: PdfLine[]) { return (lines.at(-1)?.block ?? 0) + 1; }

function wrap(value: string, width: number): string[] {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { result.push(line); line = word; }
  }
  if (line) result.push(line);
  return result.length ? result : [''];
}

function ascii(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '');
}

function buildPdf(lines: PdfLine[], title: string): Uint8Array {
  const pages: PdfLine[][] = [[]];
  let remaining = 770;
  const blocks = lines.reduce<PdfLine[][]>((groups, line) => {
    const current = groups.at(-1);
    if (!current || current[0].block !== line.block) groups.push([line]);
    else current.push(line);
    return groups;
  }, []);
  for (const block of blocks) {
    const blockHeight = block.reduce((sum, line) => sum + line.size * 1.35 + (line.gapAfter ?? 0), 0);
    if (remaining - blockHeight < 55 && pages.at(-1)!.length) { pages.push([]); remaining = 770; }
    pages.at(-1)!.push(...block);
    remaining -= blockHeight;
  }
  const pageCount = pages.length;
  const regularFontId = 3 + pageCount * 2;
  const boldFontId = regularFontId + 1;
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    let y = 800;
    const commands = [`BT /F2 8 Tf 50 820 Td (${escapePdf(ascii(title))}) Tj ET`];
    pageLines.forEach((line) => {
      commands.push(`BT /${line.bold ? 'F2' : 'F1'} ${line.size} Tf 50 ${Math.round(y)} Td (${escapePdf(line.text)}) Tj ET`);
      y -= line.size * 1.35 + (line.gapAfter ?? 0);
    });
    commands.push(`BT /F1 8 Tf 500 28 Td (${index + 1}/${pageCount}) Tj ET`);
    const stream = commands.join('\n');
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
  });
  objects[regularFontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[boldFontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

function escapePdf(text: string): string { return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
