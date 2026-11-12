import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Attendance, Host, Status, STATUS_LABELS } from "./types";

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
  selected: Host | "Semua"
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 297;
  const [year, mon] = month.split("-").map(Number);

  const monthName = new Date(year, mon - 1, 1)
    .toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });

  const hosts: Host[] =
    selected === "Semua" ? ["Aulia", "Eka"] : [selected];

  const statuses: Status[] = [
    "full",
    "four_hours",
    "holiday",
    "sick"
  ];

  const filtered = rows.filter(r => hosts.includes(r.host));
  const logo = await loadLogo();

  // HEADER
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 12, 9, 20, 20);
    } catch {
      doc.setFillColor(218, 0, 24);
      doc.roundedRect(12, 9, 20, 20, 3, 3, "F");
    }
  } else {
    doc.setFillColor(218, 0, 24);
    doc.roundedRect(12, 9, 20, 20, 3, 3, "F");
  }

  doc.setTextColor(35, 35, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("REDBOX", 37, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 125);
  doc.text("LIVE ATTENDANCE REPORT", 37, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 35);
  doc.text("MONTHLY HOST ATTENDANCE", 12, 37);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 115);
  doc.text(`PERIODE: ${monthName.toUpperCase()}`, 12, 43);

  const days = new Date(year, mon, 0).getDate();

  // LAYOUT DUA KOLOM UNTUK PDF GABUNGAN
  const gap = 7;
  const leftMargin = 12;
  const usableWidth = pageWidth - 24;
  const columnWidth =
    hosts.length === 2
      ? (usableWidth - gap) / 2
      : usableWidth;

  const startY = 47;

  hosts.forEach((host, index) => {
    const x =
      hosts.length === 2
        ? leftMargin + index * (columnWidth + gap)
        : leftMargin;

    const mine = filtered.filter(r => r.host === host);

    const counts = statuses.map(
      s => mine.filter(r => r.status === s).length
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(35, 35, 40);
    doc.text(host.toUpperCase(), x, startY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 95);

    doc.text(
      `Full ${counts[0]}  |  4 Jam ${counts[1]}  |  Libur ${counts[2]}  |  Sakit ${counts[3]}  |  Total ${mine.length}`,
      x,
      startY + 5
    );

    const dayRows = Array.from({ length: days }, (_, i) => {
      const day = i + 1;

      const date =
        `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const found = mine.find(
        r => r.attendance_date === date
      );

      return [
        String(day),
        found ? STATUS_LABELS[found.status] : "—",
        found?.note || ""
      ];
    });

    autoTable(doc, {
      startY: startY + 8,
      margin: {
        left: x,
        right: pageWidth - x - columnWidth,
        top: 8,
        bottom: 6
      },
      tableWidth: columnWidth,
      head: [["TGL", "STATUS", "CATATAN"]],
      body: dayRows,
      theme: "striped",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      styles: {
        font: "helvetica",
        fontSize: hosts.length === 2 ? 5.5 : 6,
        cellPadding: hosts.length === 2 ? 0.35 : 0.5,
        minCellHeight: 2.5,
        overflow: "ellipsize",
        textColor: [55, 55, 60]
      },
      headStyles: {
        fillColor: [42, 42, 48],
        textColor: 255,
        fontStyle: "bold",
        fontSize: hosts.length === 2 ? 5.5 : 6
      },
      columnStyles: {
        0: { cellWidth: hosts.length === 2 ? 12 : 22 },
        1: { cellWidth: hosts.length === 2 ? 24 : 38 },
        2: { cellWidth: hosts.length === 2 ? columnWidth - 36 : columnWidth - 60 }
      },
      alternateRowStyles: {
        fillColor: [248, 248, 250]
      },
      showHead: "everyPage"
    });
  });

  // FOOTER
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);

  doc.text(
    `Dicetak: ${new Date().toLocaleDateString("id-ID")}  |  REDBOX INTERNAL`,
    12,
    202
  );

  doc.text(
    "1 / 1",
    285,
    202,
    { align: "right" }
  );

  doc.save(`REDBOX-Absensi-${selected}-${month}.pdf`);
}

