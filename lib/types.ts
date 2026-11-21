export type Host = string;
export const DEFAULT_HOSTS: Host[] = ["Aulia", "Eka"];

export type HostRecord = {
  id: string;
  name: string;
  avatar_url?: string | null;
  created_at?: string;
};

export type PhotoRequestStatus = "pending" | "approved" | "rejected";

export type HostPhotoRequest = {
  id: string;
  host_name: string;
  photo_data_url: string;
  requested_by: string | null;
  status: PhotoRequestStatus;
  created_at: string;
  reviewed_at?: string | null;
};

export type Status = "holiday" | "sick" | "four_hours" | "full";
export const STATUS_LABELS: Record<Status, string> = {
  holiday: "Libur",
  sick: "Sakit",
  four_hours: "4 Jam",
  full: "Full",
};

export type Attendance = {
  id: string;
  attendance_date: string;
  host: Host;
  status: Status;
  note: string | null;
  created_at: string;
};