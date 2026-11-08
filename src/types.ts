export type ConsultantGrade = 'L1 - Junior Consultant' | 'L2 - Senior Consultant' | 'L3 - Principal Consultant' | 'L4 - Director / Partner';

export interface GradeRateConfig {
  grade: ConsultantGrade;
  code: string;
  hourlyRate: number; // in original currency
  description: string;
}

export interface AppConfig {
  baseCurrencySymbol: string;
  fxRate: number;
  validApprovalStatus: string;
  maxDailyHours: number;
  standardDailyHours: number;
  periodWorkingDays: number;
  minValidDate: string;
  maxValidDate: string;
  targetBillableRatio: number;
  targetUtilizationRate: number;
  includeMeetingInCost: 'Y' | 'N';
  meetingWeightFactor: number;
  maxSingleMeetingHours: number;
  gradeRates: GradeRateConfig[];
}

export interface Employee {
  Employee: string; // Employee Name (Primary Key)
  Employee_ID: string; // EMP-001
  Department: string;
  Consultant_Grade: ConsultantGrade;
  Active_Status: 'Active' | 'Inactive';
}

export interface Project {
  Project: string; // Project Name (Primary Key)
  Project_ID: string; // PRJ-2026-01
  Cost_Center: string; // References Cost Center in CostCenter
  Billing_Type: 'Billable' | 'Non-Billable' | 'Internal';
  Project_Category: 'Client Delivery' | 'R&D' | 'Presales' | 'Admin';
  Meeting_Keyword: string; // For automated Outlook/Teams meeting recognition
}

export interface CostCenter {
  Cost_Center: string; // Name (Primary Key)
  Cost_Center_Code: string; // CC-101
  Center_Type: 'External Work' | 'Internal Work';
  Budget_Cap: number; // in original currency
  Owner: string;
}

export interface RawAsanaLog {
  Asana_Sync_ID: string;
  Employee: string;
  Date: string; // YYYY-MM-DD
  Project: string;
  Task: string;
  Hours: number;
  Approved: string; // 'Approved' | 'Unapproved' | 'Pending'
  Sync_Timestamp: string;
}

export interface RawMeetingLog {
  Meeting_ID: string;
  Employee: string;
  Meeting_Date: string; // YYYY-MM-DD
  Meeting_Subject: string;
  Duration_Hours: number;
  Meeting_Category_Tag: string;
}

export interface ProcessedMeetingLog extends RawMeetingLog {
  Mapped_Project: string;
  Meeting_Work_Type: 'Project Meeting' | 'Internal Overhead';
  Duration_Flag: 'Normal' | 'Over-length (>4h)';
  Effective_Meeting_Hours: number;
  Meeting_Cost_Estimate: number;
}

export interface ValidationRecord {
  // Mirrored fields
  Val_Sync_ID: string;
  Val_Employee: string;
  Val_Date: string;
  Val_Project: string;
  Val_Task: string;
  Val_Hours: number;
  Val_Approved: string;

  // Mapping engine fields
  Employee_ID: string;
  Department: string;
  Consultant_Grade: ConsultantGrade | 'Unmapped';
  Cost_Center: string;
  Billing_Type: 'Billable' | 'Non-Billable' | 'Internal' | 'Unmapped';
  Project_Category: 'Client Delivery' | 'R&D' | 'Presales' | 'Admin' | 'Unmapped';

  // 6 Audit Flags (true = failure)
  Flag_Unapproved: boolean;
  Flag_Duplicate: boolean;
  Flag_Invalid_Project: boolean;
  Flag_Missing_CostCenter: boolean;
  Flag_Overtime: boolean;
  Flag_Date_Anomaly: boolean;

  Validation_Status: 'PASS' | 'FAIL';
  Error_Diagnostic_Msg: string;
}

export interface MasterTimesheetRow {
  Master_Sync_ID: string;
  Employee: string;
  Employee_ID: string;
  Department: string;
  Consultant_Grade: ConsultantGrade;
  Date: string;
  Project: string;
  Task: string;
  Hours: number;
  Cost_Center: string;
  Billing_Type: 'Billable' | 'Non-Billable' | 'Internal';
  Project_Category: 'Client Delivery' | 'R&D' | 'Presales' | 'Admin';
  Unit_Hourly_Rate: number; // in local currency
  Direct_Labor_Cost: number; // Hours * Unit_Hourly_Rate
}

export interface ProjectDashboardMetric {
  Project: string;
  Asana_Hours: number;
  Meeting_Hours: number;
  Total_Hours: number;
  Billable_Hours: number;
  Billable_Ratio: number;
  Billable_Status: 'On Target' | 'Below Target' | 'Internal Work';
  Total_Cost: number;
}

export interface EmployeeDashboardMetric {
  Employee: string;
  Consultant_Grade: ConsultantGrade;
  Standard_Capacity: number;
  Approved_Hours: number;
  Meeting_Hours: number;
  Utilization_Rate: number;
  Utilization_Status: 'Overloaded (>100%)' | 'Healthy' | 'Underutilized';
  Primary_Cost_Center: string;
}

export interface CostCenterDashboardMetric {
  Cost_Center: string;
  Center_Type: 'External Work' | 'Internal Work';
  Allocated_Hours: number;
  Allocated_Cost: number;
  Budget_Cap: number;
  Budget_Consumption_Rate: number;
}
