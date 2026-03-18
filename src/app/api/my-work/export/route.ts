import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { jsPDF } from "jspdf";

interface NoteRow {
  id: number;
  content: string;
  created_at: string;
  action_title: string;
  difficulty: string;
  topic: string | null;
  score: number | null;
  grade: string | null;
  strengths: string | null;
  improvements: string | null;
  filename: string;
  folder_name: string | null;
}

function buildQuery(userId: number, noteId?: string, folderId?: string) {
  let query = `
    SELECT
      ln.id, ln.content, ln.created_at,
      ai.title as action_title, ai.difficulty, ai.topic,
      a.score, a.grade, a.strengths, a.improvements,
      f.original_name as filename,
      fo.name as folder_name
    FROM learning_notes ln
    JOIN action_items ai ON ai.id = ln.action_item_id
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    LEFT JOIN assessments a ON a.note_id = ln.id
    LEFT JOIN folders fo ON fo.id = f.folder_id
    WHERE ln.user_id = ?
  `;
  const params: (string | number)[] = [userId, userId];

  if (noteId) {
    query += ` AND ln.id = ?`;
    params.push(Number(noteId));
  } else if (folderId) {
    query += ` AND f.folder_id = ?`;
    params.push(Number(folderId));
  }

  query += ` ORDER BY fo.name, ai.difficulty, ai.topic, ln.created_at DESC`;

  return { query, params };
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const noteId = req.nextUrl.searchParams.get("noteId") ?? undefined;
  const folderId = req.nextUrl.searchParams.get("folderId") ?? undefined;

  const db = getDb();
  const { query, params } = buildQuery(user.id, noteId, folderId);
  const rows = await db.all(query, ...params) as NoteRow[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No notes found" }, { status: 404 });
  }

  // Generate PDF
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  const title = noteId
    ? "Study Note"
    : folderId
    ? `Study Notes — ${rows[0].folder_name || "Folder"}`
    : "All Study Notes";

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported from Socraty AI — ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  for (let i = 0; i < rows.length; i++) {
    const note = rows[i];
    checkPage(40);

    // Action item header
    const diffLabel =
      note.difficulty === "easy" ? "Foundations" : note.difficulty === "medium" ? "Solidification" : "Mastery";

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const titleLines = wrapText(doc, note.action_title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 5;

    // Metadata line
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const meta = [diffLabel, note.topic, note.filename].filter(Boolean).join(" · ");
    doc.text(meta, margin, y);
    y += 5;

    if (note.grade) {
      doc.text(`Grade: ${note.grade} (${note.score}/100)`, margin, y);
      y += 5;
    }
    doc.setTextColor(0, 0, 0);
    y += 2;

    // Note content
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const contentLines = wrapText(doc, note.content, contentWidth);
    for (const line of contentLines) {
      checkPage(5);
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 3;

    // Assessment
    if (note.strengths || note.improvements) {
      const strengths = note.strengths ? (JSON.parse(note.strengths) as string[]) : [];
      const improvements = note.improvements ? (JSON.parse(note.improvements) as string[]) : [];

      if (strengths.length > 0) {
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text("Strengths:", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        for (const s of strengths) {
          checkPage(5);
          const sLines = wrapText(doc, `• ${s}`, contentWidth - 4);
          doc.text(sLines, margin + 2, y);
          y += sLines.length * 4;
        }
        y += 2;
      }

      if (improvements.length > 0) {
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(234, 88, 12);
        doc.text("Areas to Improve:", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        for (const imp of improvements) {
          checkPage(5);
          const iLines = wrapText(doc, `• ${imp}`, contentWidth - 4);
          doc.text(iLines, margin + 2, y);
          y += iLines.length * 4;
        }
        y += 2;
      }
      doc.setTextColor(0, 0, 0);
    }

    // Separator between notes
    if (i < rows.length - 1) {
      y += 3;
      checkPage(4);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename = noteId
    ? `study-note-${noteId}.pdf`
    : folderId
    ? `study-notes-folder-${folderId}.pdf`
    : "all-study-notes.pdf";

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
