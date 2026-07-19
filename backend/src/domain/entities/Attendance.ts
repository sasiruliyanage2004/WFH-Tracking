export interface BreakHistory {
  type: string;
  startTime: string | Date;
  endTime?: string | Date;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | Date;
  checkOutTime?: string | Date;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day';
  workHours: number;
  breakHours: number;
  checkInMethod?: 'manual' | 'auto';
  isAutoCheckIn?: boolean;
  onBreak?: boolean;
  currentBreakType?: string;
  currentBreakStartTime?: string | Date;
  breakHistory?: BreakHistory[];
  companyId?: string;
}
