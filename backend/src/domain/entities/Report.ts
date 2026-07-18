export interface Report {
  id: string;
  employeeId: string;
  date: string | Date;
  tasksCompleted?: string;
  tasksInProgress?: string;
  challengesFaced?: string;
  tomorrowPlan?: string;
  totalHoursWorked?: number;
  managerComments?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: string | Date;
  companyId?: string;
}
