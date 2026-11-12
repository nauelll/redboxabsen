export type Host = "Aulia" | "Eka";
export type Status = "holiday" | "sick" | "four_hours" | "full";
export const STATUS_LABELS: Record<Status,string> = {
  holiday: "Libur", sick: "Sakit", four_hours: "4 Jam", full: "Full"
};
export type Attendance = {
  id: string;
  attendance_date: string;
  host: Host;
  status: Status;
  note: string | null;
  created_at: string;
};