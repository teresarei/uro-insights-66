import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiaryEntry, ComputedStats } from '@/types/database';
import { ClinicalPattern, RecordingBlock } from '@/types/urotracker';
import { format, parseISO } from 'date-fns';

interface ExportOptions {
  entries: DiaryEntry[];
  stats: ComputedStats;
  patientName?: string;
  dateRange?: { start: string; end: string };
  recordingBlocks?: RecordingBlock[];
}

const APP_VERSION = '1.0.0';
const PRIMARY_COLOR: [number, number, number] = [35, 89, 113];
const SECONDARY_COLOR: [number, number, number] = [59, 130, 246];
const WARNING_COLOR: [number, number, number] = [234, 179, 8];

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  doc.text(
    `Voida v${APP_VERSION}`,
    14,
    pageHeight - 15
  );
  
  // Disclaimer
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    'This document summarizes diary data and guideline-based patterns. It is not a medical diagnosis.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
}

function checkNewPage(doc: jsPDF, yPos: number, minSpace: number = 60): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos > pageHeight - minSpace) {
    doc.addPage();
    return 25;
  }
  return yPos;
}

export function generateDiaryPDF(options: ExportOptions): void {
  const { entries, stats, patientName, dateRange, recordingBlocks } = options;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // ========== SECTION A: HEADER ==========
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Voida', 14, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Bladder Diary Report', 14, yPos + 8);
  
  // Date generated
  doc.setFontSize(9);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, yPos, { align: 'right' });

  yPos += 22;

  // Patient info box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Patient Information', 20, yPos + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`Name: ${patientName || 'Not specified'}`, 20, yPos + 18);
  
  if (dateRange) {
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 100, yPos + 18);
  }

  yPos += 38;

  // ========== SECTION B: DASHBOARD SUMMARY ==========
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('Dashboard Summary', 14, yPos);
  
  yPos += 3;

  // Primary stats table
  const primaryStatsData = [
    ['Total Voids', stats.totalVoids.toString(), 'Day Voids', stats.dayVoids.toString()],
    ['Total Leakages', stats.totalLeakages.toString(), 'Night Voids', stats.nightVoids.toString()],
    ['Total Intake', `${(stats.totalIntake / 1000).toFixed(2)} L`, 'Avg Voids/Day', stats.avgVoidsPerDay.toFixed(1)],
    ['Median Volume', `${stats.medianVolume} ml`, 'Volume Range', `${stats.minVolume}–${stats.maxVolume} ml`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: primaryStatsData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 38 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 38 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // Day vs Night breakdown
  const totalVoided = stats.dayVoids + stats.nightVoids > 0 
    ? ((stats.dayVoids / (stats.dayVoids + stats.nightVoids)) * 100).toFixed(0)
    : '0';
    
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Day/Night Distribution: ${totalVoided}% daytime, ${100 - parseInt(totalVoided)}% nighttime`, 14, yPos);
  
  yPos += 12;

  // ========== VOID EVENTS TABLE ==========
  const voids = entries.filter(e => e.event_type === 'void');
  if (voids.length > 0) {
    yPos = checkNewPage(doc, yPos);
    
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Void Events', 14, yPos);
    
    yPos += 4;

    // Check if any voids use catheter to decide column layout
    const hasCatheterVoids = voids.some(v => (v as any).uses_catheter);

    const voidData = voids.map(v => {
      const entry = v as any;
      const baseRow = [
        format(parseISO(v.date), 'MMM d'),
        v.time.slice(0, 5),
        `${v.volume_ml || '-'} ml`,
        v.urgency ? `${v.urgency}/5` : '-',
      ];
      
      if (hasCatheterVoids) {
        // Add catheter columns
        const catheterInfo = entry.uses_catheter 
          ? `W:${entry.volume_with_catheter_ml || '-'} / WO:${entry.volume_without_catheter_ml || '-'}`
          : '-';
        baseRow.push(catheterInfo);
      }
      
      baseRow.push((v.notes || '-').substring(0, 25));
      return baseRow;
    });

    const headers = hasCatheterVoids 
      ? [['Date', 'Time', 'Total Vol', 'Urgency', 'Catheter (W/WO)', 'Notes']]
      : [['Date', 'Time', 'Volume', 'Urgency', 'Notes']];

    autoTable(doc, {
      startY: yPos,
      head: headers,
      body: voidData,
      theme: 'striped',
      headStyles: {
        fillColor: PRIMARY_COLOR,
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: hasCatheterVoids 
        ? { 5: { cellWidth: 35 } }
        : { 4: { cellWidth: 50 } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== FLUID INTAKE TABLE ==========
  const intakes = entries.filter(e => e.event_type === 'intake');
  if (intakes.length > 0) {
    yPos = checkNewPage(doc, yPos);
    
    doc.setFontSize(13);
    doc.setTextColor(...SECONDARY_COLOR);
    doc.text('Fluid Intake', 14, yPos);
    
    yPos += 4;

    const intakeData = intakes.map(i => [
      format(parseISO(i.date), 'MMM d'),
      i.time.slice(0, 5),
      `${i.volume_ml || '-'} ml`,
      i.intake_type || '-',
      (i.notes || '-').substring(0, 30),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Volume', 'Type', 'Notes']],
      body: intakeData,
      theme: 'striped',
      headStyles: {
        fillColor: SECONDARY_COLOR,
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        4: { cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== LEAKAGE EVENTS TABLE ==========
  const leakages = entries.filter(e => e.event_type === 'leakage');
  if (leakages.length > 0) {
    yPos = checkNewPage(doc, yPos);
    
    doc.setFontSize(13);
    doc.setTextColor(...WARNING_COLOR);
    doc.text('Leakage Events', 14, yPos);
    
    yPos += 4;

    const leakageData = leakages.map(l => [
      format(parseISO(l.date), 'MMM d'),
      l.time.slice(0, 5),
      l.leakage_severity || '-',
      l.leakage_weight_g ? `${l.leakage_weight_g}g` : '-',
      l.trigger || '-',
      (l.notes || '-').substring(0, 25),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Time', 'Severity', 'Weight', 'Trigger', 'Notes']],
      body: leakageData,
      theme: 'striped',
      headStyles: {
        fillColor: WARNING_COLOR,
        textColor: [30, 30, 30],
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        5: { cellWidth: 40 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== SECTION C: DIAGNOSTIC ASSESSMENT ==========
  if (recordingBlocks && recordingBlocks.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('Diagnostic Assessment', 14, yPos);
    
    yPos += 12;

    recordingBlocks.forEach((block, blockIndex) => {
      yPos = checkNewPage(doc, yPos, 80);

      // Block header
      const startDate = format(new Date(block.start_datetime), 'MMM d, yyyy');
      const endDate = format(new Date(block.end_datetime), 'MMM d, yyyy');
      
      doc.setFillColor(240, 245, 250);
      doc.roundedRect(14, yPos, pageWidth - 28, 18, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.text(`Recording Block ${blockIndex + 1}: ${startDate} – ${endDate}`, 20, yPos + 7);
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      const statusText = block.status === 'complete' ? '✓ Complete (72h)' : '⚠ Incomplete';
      doc.text(statusText, pageWidth - 20, yPos + 7, { align: 'right' });
      
      doc.text(`Voids: ${block.void_count} | Intake: ${block.total_intake_ml}ml | Leakages: ${block.leakage_count}`, 20, yPos + 14);
      
      yPos += 24;

      // Clinical Patterns
      if (block.clinical_patterns && block.clinical_patterns.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text('Clinical Patterns (Probability-Ranked):', 14, yPos);
        yPos += 6;

        const patternData = block.clinical_patterns.map((pattern: ClinicalPattern, idx: number) => {
          const probLabel = pattern.probability === 'high' ? '●●●' 
            : pattern.probability === 'moderate' ? '●●○' 
            : '●○○';
          return [
            `${idx + 1}. ${pattern.name}`,
            probLabel,
            pattern.reasoning.substring(0, 60) + (pattern.reasoning.length > 60 ? '...' : ''),
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Pattern', 'Probability', 'Reasoning']],
          body: patternData,
          theme: 'plain',
          headStyles: {
            fillColor: [230, 235, 245],
            textColor: [40, 40, 40],
            fontSize: 8,
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25 },
            2: { cellWidth: 100 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 6;
      }

      // Overall Assessment
      if (block.overall_assessment) {
        yPos = checkNewPage(doc, yPos, 40);
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text('Overall Assessment:', 14, yPos);
        yPos += 5;
        
        const assessmentLines = doc.splitTextToSize(block.overall_assessment, pageWidth - 32);
        doc.setFontSize(9);
        doc.setTextColor(40);
        doc.text(assessmentLines, 14, yPos);
        yPos += assessmentLines.length * 4 + 6;
      }

      // Guideline Reference
      const guidelineUrl = getGuidelineUrl(block.clinical_patterns || []);
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.textWithLink('📖 EAU Guideline Reference', 14, yPos, { url: guidelineUrl });
      yPos += 8;

      // ========== SECTION D: TREATMENT PLAN ==========
      yPos = checkNewPage(doc, yPos, 50);
      
      doc.setFontSize(10);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text('Treatment Plan:', 14, yPos);
      yPos += 6;

      if (block.treatment_plan) {
        doc.setFillColor(252, 252, 250);
        doc.roundedRect(14, yPos, pageWidth - 28, 40, 2, 2, 'F');
        
        const planLines = doc.splitTextToSize(block.treatment_plan, pageWidth - 36);
        doc.setFontSize(9);
        doc.setTextColor(40);
        doc.text(planLines.slice(0, 8), 18, yPos + 6);
        
        if (block.treatment_plan_updated_at) {
          doc.setFontSize(7);
          doc.setTextColor(120);
          doc.text(
            `Last updated: ${format(new Date(block.treatment_plan_updated_at), 'MMM d, yyyy HH:mm')}`,
            18,
            yPos + 36
          );
        }
        yPos += 48;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, yPos, pageWidth - 28, 14, 2, 2, 'F');
        doc.text('No treatment plan added for this recording.', 18, yPos + 9);
        yPos += 22;
      }

      // Separator between blocks
      if (blockIndex < recordingBlocks.length - 1) {
        yPos += 5;
        doc.setDrawColor(220);
        doc.line(14, yPos, pageWidth - 14, yPos);
        yPos += 10;
      }
    });
  }

  // ========== SECTION E: FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  // Save the PDF
  const fileName = `Voida_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

function getGuidelineUrl(patterns: ClinicalPattern[]): string {
  const hasOAB = patterns.some(p => 
    p.name.toLowerCase().includes('overactive') || 
    p.name.toLowerCase().includes('oab')
  );
  const hasNocturia = patterns.some(p => 
    p.name.toLowerCase().includes('nocturia') || 
    p.name.toLowerCase().includes('nocturnal polyuria')
  );
  const hasStress = patterns.some(p => 
    p.name.toLowerCase().includes('stress')
  );
  
  if (hasOAB) {
    return 'https://uroweb.org/guidelines/non-neurogenic-female-luts';
  }
  if (hasNocturia) {
    return 'https://uroweb.org/guidelines/non-neurogenic-male-luts';
  }
  if (hasStress) {
    return 'https://uroweb.org/guidelines/urinary-incontinence';
  }
  
  return 'https://uroweb.org/guidelines/non-neurogenic-female-luts';
}
