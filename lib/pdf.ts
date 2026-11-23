import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Attendance, DEFAULT_HOSTS, Host, Status } from "./types";

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/redbox-logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportAttendancePdf(
  rows: Attendance[],
  month: string,
  selected: Host | "Semua",
  allHosts: Host[] = DEFAULT_HOSTS
) {
  // Format portrait agar laporan mudah dibaca dan hemat kertas.
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const [year, mon] = month.split("-").map(Number);
  const monthName = new Date(year, mon - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const hosts: Host[] =
    selected === "Semua"
      ? (allHosts.length ? allHosts : DEFAULT_HOSTS)
      : [selected];
  const filtered = rows.filter((r) => hosts.includes(r.host));
  const days = new Date(year, mon, 0).getDate();
  const statuses: Status[] = ["full", "four_hours", "holiday", "sick"];
  const statusShort: Record<Status, string> = {
    full: "Full",
    four_hours: "4 Jam",
    holiday: "Libur",
    sick: "Sakit",
  };

  const logo = await loadLogo();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 10, 7, 13, 13);
    } catch {
      doc.setFillColor(218, 0, 24);
      doc.roundedRect(10, 7, 13, 13, 2, 2, "F");
    }
  } else {
    doc.setFillColor(218, 0, 24);
    doc.roundedRect(10, 7, 13, 13, 2, 2, "F");
  }

  doc.setTextColor(30, 30, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("REDBOX", 27, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 105);
  doc.text("LAPORAN ABSENSI HOST", 27, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 35);
  doc.text(monthName.toLocaleUpperCase("id-ID"), pageWidth - 10, 12, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(105, 105, 110);
  doc.text(selected === "Semua" ? "Semua host" : selected, pageWidth - 10, 18, {
    align: "right",
  });

  const countsByHost = hosts.map((host) => {
    const mine = filtered.filter((r) => r.host === host);
    return {
      host,
      total: mine.length,
      counts: statuses.map((s) => mine.filter((r) => r.status === s).length),
    };
  });

  // Satu kolom per host. Catatan ikut di belakang status dan otomatis
  // dipotong bila terlalu panjang, sehingga tabel tetap rapi di A4 portrait.
  const head = [["TGL", ...hosts.map((host) => host.toUpperCase())]];
  const body = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const date = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return [
      String(day),
      ...hosts.map((host) => {
        const found = filtered.find(
          (r) => r.host === host && r.attendance_date === date
        );
        if (!found) return "—";
        const note = found.note?.trim();
        return note ? `${statusShort[found.status]} · ${note}` : statusShort[found.status];
      }),
    ];
  });

  const tableWidth = pageWidth - 20;
  const dateWidth = 13;
  const hostWidth = (tableWidth - dateWidth) / Math.max(hosts.length, 1);
  const fontSize = hosts.length > 5 ? 7 : hosts.length > 3 ? 8 : hosts.length > 1 ? 10 : 11;

  autoTable(doc, {
    startY: 26,
    margin: { left: 10, right: 10, top: 26, bottom: 12 },
    head,
    body,
    theme: "grid",
    tableWidth,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize,
      cellPadding: { top: 1.35, right: 1.5, bottom: 1.35, left: 1.5 },
      minCellHeight: 6.2,
      overflow: "ellipsize",
      valign: "middle",
      textColor: [45, 45, 50],
      lineColor: [215, 215, 220],
      lineWidth: 0.18,
    },
    headStyles: {
      fillColor: [42, 42, 48],
      textColor: 255,
      fontStyle: "bold",
      fontSize: Math.max(8, fontSize),
      halign: "center",
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: dateWidth, halign: "center", fontStyle: "bold" },
      ...Object.fromEntries(
        hosts.map((_, i) => [i + 1, { cellWidth: hostWidth, halign: "left" as const }])
      ),
    },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    didParseCell(data) {
      if (data.section !== "body" || data.column.index === 0) return;
      const value = String(data.cell.raw || "");
      if (value.startsWith("Full")) data.cell.styles.textColor = [22, 125, 70];
      else if (value.startsWith("4 Jam")) data.cell.styles.textColor = [170, 115, 0];
      else if (value.startsWith("Libur")) data.cell.styles.textColor = [205, 35, 45];
      else if (value.startsWith("Sakit")) data.cell.styles.textColor = [35, 100, 180];
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 245;
  const summaryY = Math.min(finalY + 5, pageHeight - 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(hosts.length > 4 ? 6.5 : 7.5);
  doc.setTextColor(75, 75, 80);
  const summary = countsByHost.map(({ host, total, counts }) =>
    `${host}: Full ${counts[0]} · 4 Jam ${counts[1]} · Libur ${counts[2]} · Sakit ${counts[3]} · Total ${total}`
  );
  const summaryLines = doc.splitTextToSize(summary.join("     |     "), pageWidth - 20);
  doc.text(summaryLines, 10, summaryY);

  doc.setFontSize(7);
  doc.setTextColor(130, 130, 135);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString("id-ID")}  |  REDBOX INTERNAL`,
    10,
    pageHeight - 5
  );

  doc.save(`REDBOX-Absensi-${selected}-${month}.pdf`);
}
