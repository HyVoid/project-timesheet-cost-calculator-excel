import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PieChart,
  FileSpreadsheet,
  ShieldCheck,
  Users,
  FolderKanban,
  Building2,
  Clock,
  CalendarRange,
  Settings,
  BookOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

import {
  AppConfig,
  Employee,
  Project,
  CostCenter,
  RawAsanaLog,
  RawMeetingLog,
  ProcessedMeetingLog,
  ValidationRecord,
  MasterTimesheetRow,
  ProjectDashboardMetric,
  EmployeeDashboardMetric,
  CostCenterDashboardMetric,
  ConsultantGrade
} from './types';

import {
  INITIAL_CONFIG,
  INITIAL_EMPLOYEES,
  INITIAL_PROJECTS,
  INITIAL_COST_CENTERS,
  INITIAL_ASANA_LOGS,
  INITIAL_MEETING_LOGS
} from './initialData';

export default function App() {
  // ── ACTIVE NAVIGATION TAB ──
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');

  // ── CORE STATE FROM LOCALSTORAGE OR SEED ──
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('pilot_v2_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('pilot_v2_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pilot_v2_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => {
    const saved = localStorage.getItem('pilot_v2_cost_centers');
    return saved ? JSON.parse(saved) : INITIAL_COST_CENTERS;
  });

  const [asanaLogs, setAsanaLogs] = useState<RawAsanaLog[]>(() => {
    const saved = localStorage.getItem('pilot_v2_asana_logs');
    return saved ? JSON.parse(saved) : INITIAL_ASANA_LOGS;
  });

  const [meetingLogs, setMeetingLogs] = useState<RawMeetingLog[]>(() => {
    const saved = localStorage.getItem('pilot_v2_meeting_logs');
    return saved ? JSON.parse(saved) : INITIAL_MEETING_LOGS;
  });

  const [lastSaved, setLastSaved] = useState<string>(() => {
    return localStorage.getItem('pilot_v2_last_saved') || new Date().toLocaleString('en-US');
  });

  // ── UI FILTERS & MODALS ──
  const [searchQuery, setSearchQuery] = useState('');
  const [validationFilter, setValidationFilter] = useState<'ALL' | 'FAIL' | 'PASS'>('ALL');
  const [timesheetBillingFilter, setTimesheetBillingFilter] = useState('ALL');
  const [timesheetCCFilter, setTimesheetCCFilter] = useState('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBulkCsvModal, setShowBulkCsvModal] = useState(false);
  const [csvTarget, setCsvTarget] = useState<'asana' | 'meetings'>('asana');
  const [csvText, setCsvText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab transition trigger
  const [animTrigger, setAnimTrigger] = useState(false);
  useEffect(() => {
    setAnimTrigger(true);
    const t = setTimeout(() => setAnimTrigger(false), 220);
    return () => clearTimeout(t);
  }, [activeTab]);

  // ── AUTO-SAVE PERSISTENCE ──
  const saveAllState = (
    nextConfig: AppConfig,
    nextEmployees: Employee[],
    nextProjects: Project[],
    nextCostCenters: CostCenter[],
    nextAsana: RawAsanaLog[],
    nextMeetings: RawMeetingLog[]
  ) => {
    localStorage.setItem('pilot_v2_config', JSON.stringify(nextConfig));
    localStorage.setItem('pilot_v2_employees', JSON.stringify(nextEmployees));
    localStorage.setItem('pilot_v2_projects', JSON.stringify(nextProjects));
    localStorage.setItem('pilot_v2_cost_centers', JSON.stringify(nextCostCenters));
    localStorage.setItem('pilot_v2_asana_logs', JSON.stringify(nextAsana));
    localStorage.setItem('pilot_v2_meeting_logs', JSON.stringify(nextMeetings));
    const nowStr = new Date().toLocaleString('en-US');
    localStorage.setItem('pilot_v2_last_saved', nowStr);
    setLastSaved(nowStr);
  };

  const updateState = (
    type: 'config' | 'employees' | 'projects' | 'costCenters' | 'asana' | 'meetings',
    data: any
  ) => {
    let nextConfig = config;
    let nextEmployees = employees;
    let nextProjects = projects;
    let nextCostCenters = costCenters;
    let nextAsana = asanaLogs;
    let nextMeetings = meetingLogs;

    if (type === 'config') {
      setConfig(data);
      nextConfig = data;
    } else if (type === 'employees') {
      setEmployees(data);
      nextEmployees = data;
    } else if (type === 'projects') {
      setProjects(data);
      nextProjects = data;
    } else if (type === 'costCenters') {
      setCostCenters(data);
      nextCostCenters = data;
    } else if (type === 'asana') {
      setAsanaLogs(data);
      nextAsana = data;
    } else if (type === 'meetings') {
      setMeetingLogs(data);
      nextMeetings = data;
    }

    saveAllState(nextConfig, nextEmployees, nextProjects, nextCostCenters, nextAsana, nextMeetings);
  };

  // ── HELPER LOOKUPS ──
  // Grade to hourly rate helper
  const getGradeHourlyRate = (grade: ConsultantGrade | string): number => {
    const item = config.gradeRates.find(g => g.grade === grade);
    return item ? item.hourlyRate : 0;
  };

  // ── 1. PROCESSED MEETINGS (RAW_MEETING FORMULA ENGINE) ──
  const processedMeetings = useMemo<ProcessedMeetingLog[]>(() => {
    return meetingLogs.map(log => {
      // Find matching project by keyword or exact project name in subject
      const matchingProject = projects.find(p => {
        if (p.Meeting_Keyword && log.Meeting_Subject.toLowerCase().includes(p.Meeting_Keyword.toLowerCase())) {
          return true;
        }
        return log.Meeting_Subject.toLowerCase().includes(p.Project.toLowerCase());
      });

      const mappedProject = matchingProject ? matchingProject.Project : 'Unmapped Internal';
      const isProjectMeeting = !!matchingProject;
      const meetingWorkType = isProjectMeeting ? 'Project Meeting' : 'Internal Overhead';
      const durationFlag = log.Duration_Hours > config.maxSingleMeetingHours ? 'Over-length (>4h)' : 'Normal';

      // Effective hours calculation with weight factor
      const effectiveHours = isProjectMeeting && durationFlag === 'Normal'
        ? Number((log.Duration_Hours * config.meetingWeightFactor).toFixed(2))
        : 0;

      // Rate estimation based on employee grade
      const emp = employees.find(e => e.Employee.toLowerCase() === log.Employee.toLowerCase());
      const rate = emp ? getGradeHourlyRate(emp.Consultant_Grade) : 0;
      const costEstimate = Number((effectiveHours * rate * config.fxRate).toFixed(2));

      return {
        ...log,
        Mapped_Project: mappedProject,
        Meeting_Work_Type: meetingWorkType,
        Duration_Flag: durationFlag,
        Effective_Meeting_Hours: effectiveHours,
        Meeting_Cost_Estimate: config.includeMeetingInCost === 'Y' ? costEstimate : 0,
      };
    });
  }, [meetingLogs, projects, employees, config]);

  // ── 2. VALIDATION ENGINE (6 AUDIT CHECKS) ──
  const validationRecords = useMemo<ValidationRecord[]>(() => {
    // Check duplicates: (Employee + Date + Project + Task)
    const keyCounts = new Map<string, number>();
    asanaLogs.forEach(l => {
      const k = `${l.Employee.trim().toLowerCase()}|${l.Date}|${l.Project.trim().toLowerCase()}|${l.Task.trim().toLowerCase()}`;
      keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
    });

    return asanaLogs.map(log => {
      const emp = employees.find(e => e.Employee.trim().toLowerCase() === log.Employee.trim().toLowerCase());
      const prj = projects.find(p => p.Project.trim().toLowerCase() === log.Project.trim().toLowerCase());
      const cc = prj ? costCenters.find(c => c.Cost_Center.trim().toLowerCase() === prj.Cost_Center.trim().toLowerCase()) : null;

      const gradeRate = emp ? getGradeHourlyRate(emp.Consultant_Grade) : 0;

      // 6 Checks
      const flagUnapproved = log.Approved !== config.validApprovalStatus;
      const dupKey = `${log.Employee.trim().toLowerCase()}|${log.Date}|${log.Project.trim().toLowerCase()}|${log.Task.trim().toLowerCase()}`;
      const flagDuplicate = (keyCounts.get(dupKey) || 0) > 1;
      const flagInvalidProject = !emp || !prj || gradeRate === 0;
      const flagMissingCostCenter = !prj || !cc;
      const flagOvertime = log.Hours > config.maxDailyHours || log.Hours <= 0;
      const flagDateAnomaly = log.Date < config.minValidDate || log.Date > config.maxValidDate;

      const isPass = !flagUnapproved && !flagDuplicate && !flagInvalidProject && !flagMissingCostCenter && !flagOvertime && !flagDateAnomaly;

      // Diagnostic message
      const errors: string[] = [];
      if (flagUnapproved) errors.push(`Unapproved status: "${log.Approved}"`);
      if (flagDuplicate) errors.push('Duplicate entry detected for same employee, date, project & task');
      if (!emp) errors.push(`Employee "${log.Employee}" not registered in EMPLOYEE_MAP`);
      else if (gradeRate === 0) errors.push(`Employee grade "${emp.Consultant_Grade}" missing valid rate`);
      if (!prj) errors.push(`Project "${log.Project}" not registered in PROJECT_MAP`);
      if (prj && !cc) errors.push(`Cost Center "${prj.Cost_Center}" not defined in COSTCENTER_MAP`);
      if (log.Hours <= 0) errors.push('Hours must be greater than 0');
      if (log.Hours > config.maxDailyHours) errors.push(`Hours (${log.Hours}h) exceed daily limit (${config.maxDailyHours}h)`);
      if (flagDateAnomaly) errors.push(`Date ${log.Date} outside allowable range [${config.minValidDate} - ${config.maxValidDate}]`);

      return {
        Val_Sync_ID: log.Asana_Sync_ID,
        Val_Employee: log.Employee,
        Val_Date: log.Date,
        Val_Project: log.Project,
        Val_Task: log.Task,
        Val_Hours: log.Hours,
        Val_Approved: log.Approved,

        Employee_ID: emp ? emp.Employee_ID : 'Unmapped',
        Department: emp ? emp.Department : 'Unmapped',
        Consultant_Grade: emp ? emp.Consultant_Grade : 'Unmapped',
        Cost_Center: prj ? prj.Cost_Center : 'Unmapped',
        Billing_Type: prj ? prj.Billing_Type : 'Unmapped',
        Project_Category: prj ? prj.Project_Category : 'Unmapped',

        Flag_Unapproved: flagUnapproved,
        Flag_Duplicate: flagDuplicate,
        Flag_Invalid_Project: flagInvalidProject,
        Flag_Missing_CostCenter: flagMissingCostCenter,
        Flag_Overtime: flagOvertime,
        Flag_Date_Anomaly: flagDateAnomaly,

        Validation_Status: isPass ? 'PASS' : 'FAIL',
        Error_Diagnostic_Msg: errors.length > 0 ? errors.join('; ') : 'All 6 validation rules satisfied',
      };
    });
  }, [asanaLogs, employees, projects, costCenters, config]);

  const auditAlertCount = useMemo(() => {
    return validationRecords.filter(r => r.Validation_Status === 'FAIL').length;
  }, [validationRecords]);

  // ── 3. MASTER_TIMESHEET FACT TABLE (PASS ONLY) ──
  const masterTimesheet = useMemo<MasterTimesheetRow[]>(() => {
    return validationRecords
      .filter(r => r.Validation_Status === 'PASS')
      .map(r => {
        const rateInOriginal = getGradeHourlyRate(r.Consultant_Grade);
        const unitHourlyRate = Number((rateInOriginal * config.fxRate).toFixed(2));
        const directLaborCost = Number((r.Val_Hours * unitHourlyRate).toFixed(2));

        return {
          Master_Sync_ID: r.Val_Sync_ID,
          Employee: r.Val_Employee,
          Employee_ID: r.Employee_ID,
          Department: r.Department,
          Consultant_Grade: r.Consultant_Grade as ConsultantGrade,
          Date: r.Val_Date,
          Project: r.Val_Project,
          Task: r.Val_Task,
          Hours: r.Val_Hours,
          Cost_Center: r.Cost_Center,
          Billing_Type: r.Billing_Type as 'Billable' | 'Non-Billable' | 'Internal',
          Project_Category: r.Project_Category as 'Client Delivery' | 'R&D' | 'Presales' | 'Admin',
          Unit_Hourly_Rate: unitHourlyRate,
          Direct_Labor_Cost: directLaborCost,
        };
      });
  }, [validationRecords, config]);

  // ── 4. DASHBOARD AGGREGATIONS ──
  // Project View Metrics
  const projectMetrics = useMemo<ProjectDashboardMetric[]>(() => {
    return projects.map(p => {
      const asanaApprovedHours = masterTimesheet
        .filter(m => m.Project.toLowerCase() === p.Project.toLowerCase())
        .reduce((sum, m) => sum + m.Hours, 0);

      const meetingHours = processedMeetings
        .filter(m => m.Mapped_Project.toLowerCase() === p.Project.toLowerCase())
        .reduce((sum, m) => sum + m.Effective_Meeting_Hours, 0);

      const totalHours = asanaApprovedHours + meetingHours;

      const billableHours = masterTimesheet
        .filter(m => m.Project.toLowerCase() === p.Project.toLowerCase() && m.Billing_Type === 'Billable')
        .reduce((sum, m) => sum + m.Hours, 0);

      const billableRatio = totalHours > 0 ? billableHours / totalHours : 0;

      let billableStatus: 'On Target' | 'Below Target' | 'Internal Work' = 'Below Target';
      if (p.Billing_Type === 'Internal') {
        billableStatus = 'Internal Work';
      } else if (billableRatio >= config.targetBillableRatio) {
        billableStatus = 'On Target';
      }

      const asanaDirectCost = masterTimesheet
        .filter(m => m.Project.toLowerCase() === p.Project.toLowerCase())
        .reduce((sum, m) => sum + m.Direct_Labor_Cost, 0);

      const meetingCost = processedMeetings
        .filter(m => m.Mapped_Project.toLowerCase() === p.Project.toLowerCase())
        .reduce((sum, m) => sum + m.Meeting_Cost_Estimate, 0);

      const totalCost = asanaDirectCost + (config.includeMeetingInCost === 'Y' ? meetingCost : 0);

      return {
        Project: p.Project,
        Asana_Hours: Number(asanaApprovedHours.toFixed(2)),
        Meeting_Hours: Number(meetingHours.toFixed(2)),
        Total_Hours: Number(totalHours.toFixed(2)),
        Billable_Hours: Number(billableHours.toFixed(2)),
        Billable_Ratio: billableRatio,
        Billable_Status: billableStatus,
        Total_Cost: Number(totalCost.toFixed(2)),
      };
    });
  }, [projects, masterTimesheet, processedMeetings, config]);

  // Employee View Metrics
  const employeeMetrics = useMemo<EmployeeDashboardMetric[]>(() => {
    const activeEmps = employees.filter(e => e.Active_Status === 'Active');
    const standardCapacity = config.standardDailyHours * config.periodWorkingDays;

    return activeEmps.map(emp => {
      const approvedHours = masterTimesheet
        .filter(m => m.Employee.toLowerCase() === emp.Employee.toLowerCase())
        .reduce((sum, m) => sum + m.Hours, 0);

      const meetingHours = processedMeetings
        .filter(m => m.Employee.toLowerCase() === emp.Employee.toLowerCase())
        .reduce((sum, m) => sum + m.Effective_Meeting_Hours, 0);

      const totalDelivered = approvedHours + meetingHours;
      const utilizationRate = standardCapacity > 0 ? totalDelivered / standardCapacity : 0;

      let utilizationStatus: 'Overloaded (>100%)' | 'Healthy' | 'Underutilized' = 'Underutilized';
      if (utilizationRate > 1.0) {
        utilizationStatus = 'Overloaded (>100%)';
      } else if (utilizationRate >= config.targetUtilizationRate) {
        utilizationStatus = 'Healthy';
      }

      // Primary cost center
      const empLogs = masterTimesheet.filter(m => m.Employee.toLowerCase() === emp.Employee.toLowerCase());
      const primaryCC = empLogs.length > 0 ? empLogs[0].Cost_Center : 'Unallocated';

      return {
        Employee: emp.Employee,
        Consultant_Grade: emp.Consultant_Grade,
        Standard_Capacity: standardCapacity,
        Approved_Hours: Number(approvedHours.toFixed(2)),
        Meeting_Hours: Number(meetingHours.toFixed(2)),
        Utilization_Rate: utilizationRate,
        Utilization_Status: utilizationStatus,
        Primary_Cost_Center: primaryCC,
      };
    });
  }, [employees, masterTimesheet, processedMeetings, config]);

  // Cost Center View Metrics
  const costCenterMetrics = useMemo<CostCenterDashboardMetric[]>(() => {
    return costCenters.map(cc => {
      const allocatedHours = masterTimesheet
        .filter(m => m.Cost_Center.toLowerCase() === cc.Cost_Center.toLowerCase())
        .reduce((sum, m) => sum + m.Hours, 0);

      const allocatedCost = masterTimesheet
        .filter(m => m.Cost_Center.toLowerCase() === cc.Cost_Center.toLowerCase())
        .reduce((sum, m) => sum + m.Direct_Labor_Cost, 0);

      const budgetCapLocal = Number((cc.Budget_Cap * config.fxRate).toFixed(2));
      const budgetConsumptionRate = budgetCapLocal > 0 ? allocatedCost / budgetCapLocal : 0;

      return {
        Cost_Center: cc.Cost_Center,
        Center_Type: cc.Center_Type,
        Allocated_Hours: Number(allocatedHours.toFixed(2)),
        Allocated_Cost: Number(allocatedCost.toFixed(2)),
        Budget_Cap: budgetCapLocal,
        Budget_Consumption_Rate: budgetConsumptionRate,
      };
    });
  }, [costCenters, masterTimesheet, config]);

  // Overall Totals
  const totalApprovedHours = useMemo(() => {
    return masterTimesheet.reduce((sum, r) => sum + r.Hours, 0);
  }, [masterTimesheet]);

  const totalDirectLaborCost = useMemo(() => {
    return masterTimesheet.reduce((sum, r) => sum + r.Direct_Labor_Cost, 0);
  }, [masterTimesheet]);

  const totalEffectiveMeetingHours = useMemo(() => {
    return processedMeetings.reduce((sum, m) => sum + m.Effective_Meeting_Hours, 0);
  }, [processedMeetings]);

  const totalMeetingCost = useMemo(() => {
    return processedMeetings.reduce((sum, m) => sum + m.Meeting_Cost_Estimate, 0);
  }, [processedMeetings]);

  const totalCombinedCost = useMemo(() => {
    return totalDirectLaborCost + (config.includeMeetingInCost === 'Y' ? totalMeetingCost : 0);
  }, [totalDirectLaborCost, totalMeetingCost, config.includeMeetingInCost]);

  // ── AUDIT ONE-CLICK FIXES ──
  const handleApproveAllPending = () => {
    const updated = asanaLogs.map(l => {
      if (l.Approved !== config.validApprovalStatus) {
        return { ...l, Approved: config.validApprovalStatus };
      }
      return l;
    });
    updateState('asana', updated);
  };

  const handleRegisterMissingProject = (projectName: string) => {
    const defaultCC = costCenters[0]?.Cost_Center || 'Enterprise Delivery Center';
    const newPrj: Project = {
      Project: projectName,
      Project_ID: `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`,
      Cost_Center: defaultCC,
      Billing_Type: 'Billable',
      Project_Category: 'Client Delivery',
      Meeting_Keyword: projectName.split(' ')[0] || projectName,
    };
    updateState('projects', [...projects, newPrj]);
  };

  const handleRegisterMissingEmployee = (empName: string) => {
    const newEmp: Employee = {
      Employee: empName,
      Employee_ID: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
      Department: 'Delivery Advisory',
      Consultant_Grade: 'L2 - Senior Consultant',
      Active_Status: 'Active',
    };
    updateState('employees', [...employees, newEmp]);
  };

  // ── EXPORT / IMPORT BACKUP ──
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0-tiered-architecture',
      exportedAt: new Date().toISOString(),
      config,
      employees,
      projects,
      costCenters,
      asanaLogs,
      meetingLogs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `project-time-tracking-excel-template-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.config && json.employees && json.projects && json.costCenters && json.asanaLogs && json.meetingLogs) {
          setConfig(json.config);
          setEmployees(json.employees);
          setProjects(json.projects);
          setCostCenters(json.costCenters);
          setAsanaLogs(json.asanaLogs);
          setMeetingLogs(json.meetingLogs);
          saveAllState(json.config, json.employees, json.projects, json.costCenters, json.asanaLogs, json.meetingLogs);
          setActiveTab('DASHBOARD');
        } else {
          alert('Invalid backup file schema. Please verify all 6 core sheets are present in the JSON.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── RESET DATA TO FACTORY SEED ──
  const handleResetData = () => {
    setConfig(INITIAL_CONFIG);
    setEmployees(INITIAL_EMPLOYEES);
    setProjects(INITIAL_PROJECTS);
    setCostCenters(INITIAL_COST_CENTERS);
    setAsanaLogs(INITIAL_ASANA_LOGS);
    setMeetingLogs(INITIAL_MEETING_LOGS);
    saveAllState(INITIAL_CONFIG, INITIAL_EMPLOYEES, INITIAL_PROJECTS, INITIAL_COST_CENTERS, INITIAL_ASANA_LOGS, INITIAL_MEETING_LOGS);
    setShowResetConfirm(false);
  };

  // ── BULK CSV IMPORT HANDLER ──
  const handleProcessBulkCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    if (csvTarget === 'asana') {
      const newEntries: RawAsanaLog[] = [];
      lines.forEach((line, idx) => {
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 5) {
          // Employee, Date, Project, Task, Hours, Approved
          newEntries.push({
            Asana_Sync_ID: `CSV-${Date.now()}-${idx + 1}`,
            Employee: cols[0],
            Date: cols[1] || new Date().toISOString().split('T')[0],
            Project: cols[2],
            Task: cols[3],
            Hours: parseFloat(cols[4]) || 1.0,
            Approved: cols[5] || 'Approved',
            Sync_Timestamp: new Date().toISOString(),
          });
        }
      });
      if (newEntries.length > 0) {
        updateState('asana', [...asanaLogs, ...newEntries]);
        setCsvText('');
        setShowBulkCsvModal(false);
      }
    } else {
      const newEntries: RawMeetingLog[] = [];
      lines.forEach((line, idx) => {
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 4) {
          // Employee, Meeting_Date, Subject, Duration
          newEntries.push({
            Meeting_ID: `MTG-CSV-${Date.now()}-${idx + 1}`,
            Employee: cols[0],
            Meeting_Date: cols[1] || new Date().toISOString().split('T')[0],
            Meeting_Subject: cols[2],
            Duration_Hours: parseFloat(cols[3]) || 1.0,
            Meeting_Category_Tag: cols[4] || 'CSV Import',
          });
        }
      });
      if (newEntries.length > 0) {
        updateState('meetings', [...meetingLogs, ...newEntries]);
        setCsvText('');
        setShowBulkCsvModal(false);
      }
    }
  };

  // ── RENDER ──
  return (
    <div className="min-h-screen flex flex-col font-sans-body antialiased bg-[var(--bg)] text-[var(--brand)]">
      {/* ── TOP HORIZONTAL NAVBAR (56px) ── */}
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-[var(--border)] shadow-[0_1px_2px_rgba(5,28,44,0.03)] flex items-center justify-between px-6 xl:px-10">
        <div className="flex items-center gap-3 shrink-0 mr-4">
          <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center text-[var(--accent)] font-semibold text-xs tracking-wider shadow-xs">
            TW
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-eb-garamond text-xl font-bold tracking-[-0.02em] text-[var(--brand)] whitespace-nowrap">
              Theseus Workshop
            </span>
            <span className="text-[12px] font-mono text-[var(--muted)] whitespace-nowrap hidden sm:inline">
              project-time-tracking-excel-template
            </span>
          </div>
        </div>

        {/* Tab Navigation Corresponding to Workbook Sheets */}
        <nav className="flex h-full items-center overflow-x-auto no-scrollbar gap-0.5">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: PieChart },
            { id: 'MASTER_TIMESHEET', label: 'Master Timesheet', icon: FileSpreadsheet },
            { id: 'VALIDATION', label: 'Validation Centre', icon: ShieldCheck, badge: auditAlertCount },
            { id: 'EMPLOYEE_MAP', label: 'Employee Master', icon: Users },
            { id: 'PROJECT_MAP', label: 'Project Master', icon: FolderKanban },
            { id: 'COSTCENTER_MAP', label: 'Cost Centers', icon: Building2 },
            { id: 'RAW_ASANA', label: 'Raw Asana', icon: Clock },
            { id: 'RAW_MEETING', label: 'Raw Meetings', icon: CalendarRange },
            { id: 'CONFIG', label: 'Configuration', icon: Settings },
            { id: 'README', label: 'SOP Guide', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id.toLowerCase()}`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 h-full px-2.5 xl:px-3 text-[12.5px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--brand)]/60 hover:text-[var(--accent)] hover:bg-[var(--bg)]/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 bg-[var(--danger)] text-white">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent)] rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── MAIN CONTENT CONTAINER (1400px Max, 40px padding) ── */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 xl:px-10 py-7">
        {/* Top Control Bar: Header & Data Persistence Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-eb-garamond text-3xl font-bold tracking-tight text-[var(--brand)]">
                {activeTab === 'DASHBOARD' && 'Management Executive Dashboard'}
                {activeTab === 'MASTER_TIMESHEET' && 'Unified Master Timesheet (Single Source of Truth)'}
                {activeTab === 'VALIDATION' && '6-Point Integrity Audit & Security Firewall'}
                {activeTab === 'EMPLOYEE_MAP' && 'Employee Master & Consultant Tier Rates'}
                {activeTab === 'PROJECT_MAP' && 'Project Master & Cost Center Scope Mapping'}
                {activeTab === 'COSTCENTER_MAP' && 'Cost Center Master & Budget Allocations'}
                {activeTab === 'RAW_ASANA' && 'Raw Asana Ingestion Stage (Read/Edit)'}
                {activeTab === 'RAW_MEETING' && 'Raw Meetings Overhead & Calendar Capture'}
                {activeTab === 'CONFIG' && 'Global Parameters & Tiered Rate Matrix'}
                {activeTab === 'README' && 'Implementation Architecture & Non-Technical SOP'}
              </h1>
            </div>
            <p className="text-[var(--muted)] text-[13px]">
              {activeTab === 'DASHBOARD' && 'Real-time multi-dimensional intelligence across projects, consultant grades, and cost center budgets.'}
              {activeTab === 'MASTER_TIMESHEET' && '100% verified, approved project hours dynamically priced by consultant grade tiered rates.'}
              {activeTab === 'VALIDATION' && 'Automatic interception of unapproved hours, duplicates, missing master mappings, and overtime anomalies.'}
              {activeTab === 'EMPLOYEE_MAP' && 'Manage consultant grade tiers (L1–L4) with auto-linked hourly billing rates.'}
              {activeTab === 'PROJECT_MAP' && 'Bind operational project deliverables to accounting cost centers and commercial billing types.'}
              {activeTab === 'COSTCENTER_MAP' && 'Define internal vs. external cost centers and monitor periodic budget consumption caps.'}
              {activeTab === 'RAW_ASANA' && 'Simulated Power Automate landing table for raw project work logs.'}
              {activeTab === 'RAW_MEETING' && 'Capture hidden internal meeting overhead and calculate effective billable conversions.'}
              {activeTab === 'CONFIG' && 'Single-point adjustment for rates, currency conversions, approval standards, and capacity thresholds.'}
              {activeTab === 'README' && 'System topology, Excel dynamic array logic, weekly audit SOP, and operational troubleshooting.'}
            </p>
          </div>

          {/* Persistence & Backup Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] text-[var(--muted)] bg-white px-3 py-1.5 rounded-lg border border-[var(--border)] shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-pulse" />
              <span>Last saved: <strong className="font-mono text-[var(--brand)]">{lastSaved}</strong></span>
            </div>

            <button
              onClick={() => setShowBulkCsvModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-[var(--bg)] text-[var(--brand)] border border-[var(--border)] rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Bulk CSV Import</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 bg-white hover:bg-[var(--bg)] text-[var(--brand)] border border-[var(--border)] rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Export Backup</span>
            </button>

            <label className="px-3 py-1.5 bg-white hover:bg-[var(--bg)] text-[var(--brand)] border border-[var(--border)] rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Import Backup</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 bg-white hover:bg-red-50 text-[var(--danger)] border border-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>

        {/* ── DYNAMIC VIEW CONTENT ── */}
        <div className={`transition-all duration-200 ${animTrigger ? 'animate-fade-up' : ''}`}>

          {/* ══════════════════════════════════════════════════════════════
              VIEW 1: DASHBOARD (M4 MANAGEMENT COCKPIT)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6">
              {/* Top Alert Bar / Global Security Indicator */}
              {auditAlertCount > 0 ? (
                <div className="p-4 bg-red-50/90 border border-red-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--danger)] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--danger)]">
                        {auditAlertCount} Pending Anomaly Record{auditAlertCount > 1 ? 's' : ''} Intercepted
                      </h2>
                      <p className="text-xs text-red-800">
                        Dirty records (unapproved hours, unregistered projects, or overtime breaches) are safely held in the Validation Pool and excluded from Master Timesheet.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleApproveAllPending}
                      className="px-3 py-1.5 bg-white text-[var(--danger)] border border-red-300 rounded-lg text-xs font-medium hover:bg-red-100 cursor-pointer transition-colors"
                    >
                      Quick-Approve Pending
                    </button>
                    <button
                      onClick={() => setActiveTab('VALIDATION')}
                      className="px-3 py-1.5 bg-[var(--danger)] text-white rounded-lg text-xs font-medium hover:opacity-90 cursor-pointer transition-opacity flex items-center gap-1"
                    >
                      <span>Open Validation Centre</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--ok)] flex items-center justify-center text-white shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-emerald-900">
                        100% Data Integrity Verified
                      </h2>
                      <p className="text-xs text-emerald-700">
                        All timesheet records have successfully passed the 6-point audit. Direct labor costs and cost centers are completely synchronized.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                    Audit Alerts: 0
                  </span>
                </div>
              )}

              {/* KPI Metrics Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Verified Hours
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--brand)]">
                    {totalApprovedHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">Master fact table</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Direct Labor Cost
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--brand)]">
                    {config.baseCurrencySymbol}{totalDirectLaborCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">Tiered rate matrix (L1–L4)</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Meeting Overhead
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--brand)]">
                    {totalEffectiveMeetingHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">Effective {config.meetingWeightFactor * 100}% weight</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Total Project Cost
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--accent)]">
                    {config.baseCurrencySymbol}{totalCombinedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">
                    Meeting cost {config.includeMeetingInCost === 'Y' ? 'Included' : 'Excluded'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Billable Ratio
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--brand)]">
                    {totalApprovedHours > 0
                      ? ((masterTimesheet.filter(m => m.Billing_Type === 'Billable').reduce((s, m) => s + m.Hours, 0) / totalApprovedHours) * 100).toFixed(1)
                      : '0.0'}%
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">Target: {(config.targetBillableRatio * 100).toFixed(0)}%</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[var(--border)] shadow-xs card-hover">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">
                    Workforce Size
                  </span>
                  <div className="font-eb-garamond text-2xl font-bold tracking-tight text-[var(--brand)]">
                    {employees.filter(e => e.Active_Status === 'Active').length} Active
                  </div>
                  <span className="text-[11px] text-[var(--muted)]">Pilot cohort</span>
                </div>
              </div>

              {/* Module 1: Project View */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="font-eb-garamond text-lg font-bold text-[var(--brand)]">
                      Module 1: Project Financial Performance & Billable Ratio
                    </h2>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Formula: <code className="font-mono bg-[var(--bg)] px-1.5 py-0.5 rounded text-[11px]">Billable Ratio = Billable Hours / (Asana + Meeting Hours)</code>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-3 py-3 text-right">Asana Hours</th>
                        <th className="px-3 py-3 text-right">Meeting Hours</th>
                        <th className="px-3 py-3 text-right">Total Hours</th>
                        <th className="px-3 py-3 text-right">Billable Hours</th>
                        <th className="px-4 py-3 text-left">Billable Ratio</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white">
                      {projectMetrics.map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--brand)]">
                            {p.Project}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs">
                            {p.Asana_Hours.toFixed(1)}h
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-[var(--muted)]">
                            {p.Meeting_Hours.toFixed(1)}h
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs font-semibold">
                            {p.Total_Hours.toFixed(1)}h
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-[var(--accent)]">
                            {p.Billable_Hours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--brand)]/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(p.Billable_Ratio * 100, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs">{(p.Billable_Ratio * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              p.Billable_Status === 'On Target'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : p.Billable_Status === 'Internal Work'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {p.Billable_Status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--brand)]">
                            {config.baseCurrencySymbol}{p.Total_Cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Module 2: Employee Grade, Capacity & Utilization */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="font-eb-garamond text-lg font-bold text-[var(--brand)]">
                      Module 2: Consultant Grade, Capacity & Resource Utilization
                    </h2>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Standard Capacity: <strong className="font-mono text-[var(--brand)]">{config.standardDailyHours * config.periodWorkingDays}h</strong> ({config.periodWorkingDays} days @ {config.standardDailyHours}h/day)
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3">Consultant Name</th>
                        <th className="px-3 py-3">Grade & Tier</th>
                        <th className="px-3 py-3 text-right">Target Capacity</th>
                        <th className="px-3 py-3 text-right">Approved Hours</th>
                        <th className="px-3 py-3 text-right">Meeting Hours</th>
                        <th className="px-4 py-3 text-left">Utilization Rate</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Primary Cost Center</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white">
                      {employeeMetrics.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--brand)]">
                            {emp.Employee}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--brand)]/5 text-[var(--brand)]">
                              {emp.Consultant_Grade}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-[var(--muted)]">
                            {emp.Standard_Capacity}h
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs font-semibold">
                            {emp.Approved_Hours.toFixed(1)}h
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-[var(--muted)]">
                            {emp.Meeting_Hours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--brand)]/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    emp.Utilization_Rate > 1.0 ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'
                                  }`}
                                  style={{ width: `${Math.min(emp.Utilization_Rate * 100, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs">{(emp.Utilization_Rate * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              emp.Utilization_Status === 'Healthy'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : emp.Utilization_Status === 'Overloaded (>100%)'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {emp.Utilization_Status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--muted)] font-mono">
                            {emp.Primary_Cost_Center}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Module 3: Cost Center Budget Allocation */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="font-eb-garamond text-lg font-bold text-[var(--brand)]">
                      Module 3: Accounting Cost Center Budget Consumption
                    </h2>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    Local FX Conversion: <strong className="font-mono text-[var(--brand)]">x{config.fxRate.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-4 py-3">Cost Center Name</th>
                        <th className="px-3 py-3">Work Type</th>
                        <th className="px-3 py-3 text-right">Allocated Hours</th>
                        <th className="px-4 py-3 text-right">Actual Incurred Cost</th>
                        <th className="px-4 py-3 text-right">Periodic Budget Cap</th>
                        <th className="px-4 py-3 text-left">Consumption Ratio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white">
                      {costCenterMetrics.map((cc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--brand)]">
                            {cc.Cost_Center}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              cc.Center_Type === 'External Work'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {cc.Center_Type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs">
                            {cc.Allocated_Hours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--brand)]">
                            {config.baseCurrencySymbol}{cc.Allocated_Cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-[var(--muted)]">
                            {config.baseCurrencySymbol}{cc.Budget_Cap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-2 bg-[var(--brand)]/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    cc.Budget_Consumption_Rate > 1.0 ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'
                                  }`}
                                  style={{ width: `${Math.min(cc.Budget_Consumption_Rate * 100, 100)}%` }}
                                />
                              </div>
                              <span className={`font-mono text-xs ${cc.Budget_Consumption_Rate > 1.0 ? 'text-[var(--danger)] font-bold' : ''}`}>
                                {(cc.Budget_Consumption_Rate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 2: MASTER_TIMESHEET (SINGLE TRUST FACT TABLE)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'MASTER_TIMESHEET' && (
            <div className="space-y-4">
              {/* Insight callout block */}
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl">
                <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                  Single Source of Truth Fact Table (14 Columns)
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Automatically populated via dynamic array formula <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[var(--border)]">=FILTER(VALIDATION!A2#, VALIDATION!T2#="PASS")</code>.
                  Each line is priced by consultant grade tiered hourly rates. Zero manual entry permitted in this layer.
                </p>
              </div>

              {/* Filters toolbar */}
              <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="text"
                      placeholder="Search consultant, project, or task..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs w-64 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <select
                    value={timesheetBillingFilter}
                    onChange={e => setTimesheetBillingFilter(e.target.value)}
                    className="px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Billing Types</option>
                    <option value="Billable">Billable</option>
                    <option value="Non-Billable">Non-Billable</option>
                    <option value="Internal">Internal</option>
                  </select>

                  <select
                    value={timesheetCCFilter}
                    onChange={e => setTimesheetCCFilter(e.target.value)}
                    className="px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Cost Centers</option>
                    {costCenters.map(cc => (
                      <option key={cc.Cost_Center} value={cc.Cost_Center}>{cc.Cost_Center}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-[var(--muted)]">
                  Showing <strong className="text-[var(--brand)] font-mono">{masterTimesheet.length}</strong> verified records
                </div>
              </div>

              {/* Master Table */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-3 py-2.5">Sync ID</th>
                        <th className="px-3 py-2.5">Consultant</th>
                        <th className="px-2 py-2.5">Emp ID</th>
                        <th className="px-3 py-2.5">Grade</th>
                        <th className="px-2.5 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Project</th>
                        <th className="px-4 py-2.5">Task Description</th>
                        <th className="px-2.5 py-2.5 text-right">Hours</th>
                        <th className="px-3 py-2.5">Cost Center</th>
                        <th className="px-2.5 py-2.5 text-center">Billing</th>
                        <th className="px-3 py-2.5 text-right">Unit Rate</th>
                        <th className="px-4 py-2.5 text-right">Labor Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {masterTimesheet
                        .filter(r => {
                          if (searchQuery) {
                            const q = searchQuery.toLowerCase();
                            const match = r.Employee.toLowerCase().includes(q) ||
                                          r.Project.toLowerCase().includes(q) ||
                                          r.Task.toLowerCase().includes(q) ||
                                          r.Master_Sync_ID.toLowerCase().includes(q);
                            if (!match) return false;
                          }
                          if (timesheetBillingFilter !== 'ALL' && r.Billing_Type !== timesheetBillingFilter) return false;
                          if (timesheetCCFilter !== 'ALL' && r.Cost_Center !== timesheetCCFilter) return false;
                          return true;
                        })
                        .map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]">
                              {row.Master_Sync_ID}
                            </td>
                            <td className="px-3 py-2 font-medium text-[var(--brand)]">
                              {row.Employee}
                            </td>
                            <td className="px-2 py-2 font-mono text-[11px] text-[var(--muted)]">
                              {row.Employee_ID}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[var(--brand)]/5 text-[var(--brand)]">
                                {row.Consultant_Grade.split(' - ')[0]}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 font-mono text-xs">
                              {row.Date}
                            </td>
                            <td className="px-3 py-2 text-[var(--brand)] font-medium">
                              {row.Project}
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate" title={row.Task}>
                              {row.Task}
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono font-semibold">
                              {row.Hours.toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-xs text-[var(--muted)] font-mono">
                              {row.Cost_Center}
                            </td>
                            <td className="px-2.5 py-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                row.Billing_Type === 'Billable'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {row.Billing_Type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-[var(--muted)]">
                              {config.baseCurrencySymbol}{row.Unit_Hourly_Rate.toFixed(0)}/h
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-[var(--brand)]">
                              {config.baseCurrencySymbol}{row.Direct_Labor_Cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 3: VALIDATION (6-POINT AUDIT FIREWALL)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'VALIDATION' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Automated 6-Point Security Audit & Mapping Firewall
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Evaluates 6 integrity rules: (1) Unapproved Status, (2) Duplicate Entries, (3) Unregistered Employee/Project/Tier, (4) Unmapped Cost Center, (5) Overtime &gt;{config.maxDailyHours}h, (6) Date anomalies. Only records with status <span className="font-semibold text-emerald-700">PASS</span> migrate to Master Timesheet.
                  </p>
                </div>
                {auditAlertCount > 0 && (
                  <button
                    onClick={handleApproveAllPending}
                    className="px-3 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>One-Click Approve All Pending</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setValidationFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    validationFilter === 'ALL'
                      ? 'bg-[var(--brand)] text-white'
                      : 'bg-white text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--bg)]'
                  }`}
                >
                  All Ingested Records ({validationRecords.length})
                </button>
                <button
                  onClick={() => setValidationFilter('FAIL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    validationFilter === 'FAIL'
                      ? 'bg-[var(--danger)] text-white'
                      : 'bg-white text-[var(--danger)] border border-red-200 hover:bg-red-50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Audit Interceptions ({auditAlertCount})</span>
                </button>
                <button
                  onClick={() => setValidationFilter('PASS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    validationFilter === 'PASS'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  Passed Validations ({validationRecords.length - auditAlertCount})
                </button>
              </div>

              {/* Validation Table */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-3 py-2.5">Sync ID</th>
                        <th className="px-3 py-2.5">Consultant</th>
                        <th className="px-2.5 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Project</th>
                        <th className="px-2.5 py-2.5 text-right">Hours</th>
                        <th className="px-2.5 py-2.5">Approval</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5">Diagnostic Message & Guided Remediation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {validationRecords
                        .filter(r => {
                          if (validationFilter === 'FAIL') return r.Validation_Status === 'FAIL';
                          if (validationFilter === 'PASS') return r.Validation_Status === 'PASS';
                          return true;
                        })
                        .map((row, idx) => (
                          <tr key={idx} className={row.Validation_Status === 'FAIL' ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50/50'}>
                            <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]">
                              {row.Val_Sync_ID}
                            </td>
                            <td className="px-3 py-2 font-medium text-[var(--brand)]">
                              {row.Val_Employee}
                            </td>
                            <td className="px-2.5 py-2 font-mono text-xs">
                              {row.Val_Date}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {row.Val_Project}
                            </td>
                            <td className="px-2.5 py-2 text-right font-mono font-semibold">
                              {row.Val_Hours.toFixed(1)}
                            </td>
                            <td className="px-2.5 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                row.Val_Approved === config.validApprovalStatus
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {row.Val_Approved}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                row.Validation_Status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800 border border-red-300'
                              }`}>
                                {row.Validation_Status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={row.Validation_Status === 'FAIL' ? 'text-red-700 font-medium' : 'text-gray-500'}>
                                  {row.Error_Diagnostic_Msg}
                                </span>
                                {row.Validation_Status === 'FAIL' && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {row.Flag_Unapproved && (
                                      <button
                                        onClick={() => {
                                          const updated = asanaLogs.map(l =>
                                            l.Asana_Sync_ID === row.Val_Sync_ID ? { ...l, Approved: config.validApprovalStatus } : l
                                          );
                                          updateState('asana', updated);
                                        }}
                                        className="text-[11px] px-2 py-0.5 bg-white border border-red-300 text-red-700 rounded hover:bg-red-100 cursor-pointer font-medium"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {row.Flag_Invalid_Project && !projects.some(p => p.Project.toLowerCase() === row.Val_Project.toLowerCase()) && (
                                      <button
                                        onClick={() => handleRegisterMissingProject(row.Val_Project)}
                                        className="text-[11px] px-2 py-0.5 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 cursor-pointer font-medium"
                                      >
                                        Register Project
                                      </button>
                                    )}
                                    {row.Flag_Invalid_Project && !employees.some(e => e.Employee.toLowerCase() === row.Val_Employee.toLowerCase()) && (
                                      <button
                                        onClick={() => handleRegisterMissingEmployee(row.Val_Employee)}
                                        className="text-[11px] px-2 py-0.5 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 cursor-pointer font-medium"
                                      >
                                        Register Employee
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 4: EMPLOYEE_MAP (CONSULTANT TIER RATES)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'EMPLOYEE_MAP' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Employee Master & Consultant Grade Tier Rates
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Editable input columns (light background <code className="bg-[var(--input-bg)] px-1 rounded">--input-bg</code>) manage employee details and Consultant Grade (L1–L4).
                    The rightmost column <span className="font-semibold text-[var(--brand)]">Tiered_Hourly_Rate</span> automatically calculates based on <code className="font-mono bg-white px-1 rounded border border-[var(--border)]">CONFIG!$A$15:$B$18</code>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const nextId = `EMP-${String(employees.length + 1).padStart(3, '0')}`;
                    const newEmp: Employee = {
                      Employee: `New Consultant ${employees.length + 1}`,
                      Employee_ID: nextId,
                      Department: 'Engineering',
                      Consultant_Grade: 'L2 - Senior Consultant',
                      Active_Status: 'Active',
                    };
                    updateState('employees', [...employees, newEmp]);
                  }}
                  className="px-3 py-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Employee</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3">Employee Name</th>
                        <th className="px-3 py-3">Employee ID</th>
                        <th className="px-3 py-3">Department</th>
                        <th className="px-4 py-3">Consultant Grade (Tier)</th>
                        <th className="px-3 py-3">Active Status</th>
                        <th className="px-4 py-3 text-right bg-gray-100/70">Tiered Hourly Rate (Formula)</th>
                        <th className="px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {employees.map((emp, idx) => {
                        const calculatedRate = getGradeHourlyRate(emp.Consultant_Grade);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={emp.Employee}
                                onChange={e => {
                                  const updated = [...employees];
                                  updated[idx] = { ...updated[idx], Employee: e.target.value };
                                  updateState('employees', updated);
                                }}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={emp.Employee_ID}
                                onChange={e => {
                                  const updated = [...employees];
                                  updated[idx] = { ...updated[idx], Employee_ID: e.target.value };
                                  updateState('employees', updated);
                                }}
                                className="w-24 px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={emp.Department}
                                onChange={e => {
                                  const updated = [...employees];
                                  updated[idx] = { ...updated[idx], Department: e.target.value };
                                  updateState('employees', updated);
                                }}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={emp.Consultant_Grade}
                                onChange={e => {
                                  const updated = [...employees];
                                  updated[idx] = { ...updated[idx], Consultant_Grade: e.target.value as ConsultantGrade };
                                  updateState('employees', updated);
                                }}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                              >
                                {config.gradeRates.map(g => (
                                  <option key={g.code} value={g.grade}>
                                    {g.grade} ({config.baseCurrencySymbol}{g.hourlyRate}/h)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={emp.Active_Status}
                                onChange={e => {
                                  const updated = [...employees];
                                  updated[idx] = { ...updated[idx], Active_Status: e.target.value as 'Active' | 'Inactive' };
                                  updateState('employees', updated);
                                }}
                                className="px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right bg-gray-50/60 font-mono font-bold text-[var(--brand)]">
                              {config.baseCurrencySymbol}{calculatedRate.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  if (employees.length <= 1) return;
                                  const updated = employees.filter((_, i) => i !== idx);
                                  updateState('employees', updated);
                                }}
                                className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                title="Remove employee"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 5: PROJECT_MAP
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'PROJECT_MAP' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Project Master Data & Cost Center Scope Mapping
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Map Asana projects to accounting cost centers, specify commercial billing types (Billable / Non-Billable / Internal), and define meeting recognition keywords.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newPrj: Project = {
                      Project: `New Project Initiative ${projects.length + 1}`,
                      Project_ID: `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`,
                      Cost_Center: costCenters[0]?.Cost_Center || 'Enterprise Delivery Center',
                      Billing_Type: 'Billable',
                      Project_Category: 'Client Delivery',
                      Meeting_Keyword: `Initiative ${projects.length + 1}`,
                    };
                    updateState('projects', [...projects, newPrj]);
                  }}
                  className="px-3 py-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Project</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-3 py-3">Project ID</th>
                        <th className="px-4 py-3">Target Cost Center</th>
                        <th className="px-3 py-3">Billing Type</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Meeting Keyword</th>
                        <th className="px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {projects.map((prj, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={prj.Project}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Project: e.target.value };
                                updateState('projects', updated);
                              }}
                              className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={prj.Project_ID}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Project_ID: e.target.value };
                                updateState('projects', updated);
                              }}
                              className="w-24 px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={prj.Cost_Center}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Cost_Center: e.target.value };
                                updateState('projects', updated);
                              }}
                              className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                            >
                              {costCenters.map(cc => (
                                <option key={cc.Cost_Center} value={cc.Cost_Center}>
                                  {cc.Cost_Center}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={prj.Billing_Type}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Billing_Type: e.target.value as any };
                                updateState('projects', updated);
                              }}
                              className="px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                            >
                              <option value="Billable">Billable</option>
                              <option value="Non-Billable">Non-Billable</option>
                              <option value="Internal">Internal</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={prj.Project_Category}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Project_Category: e.target.value as any };
                                updateState('projects', updated);
                              }}
                              className="px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                            >
                              <option value="Client Delivery">Client Delivery</option>
                              <option value="R&D">R&D</option>
                              <option value="Presales">Presales</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={prj.Meeting_Keyword}
                              onChange={e => {
                                const updated = [...projects];
                                updated[idx] = { ...updated[idx], Meeting_Keyword: e.target.value };
                                updateState('projects', updated);
                              }}
                              className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => {
                                if (projects.length <= 1) return;
                                const updated = projects.filter((_, i) => i !== idx);
                                updateState('projects', updated);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                              title="Remove project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 6: COSTCENTER_MAP
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'COSTCENTER_MAP' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Cost Center Master Data & Budget Allocation Limits
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Financial cost allocation units. Column <span className="font-semibold text-[var(--brand)]">Local_Budget_Cap</span> converts original currency budget caps to base currency using <code className="font-mono bg-white px-1 rounded border border-[var(--border)]">=Budget_Cap * FX_Rate</code>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newCC: CostCenter = {
                      Cost_Center: `New Cost Center CC-${100 + costCenters.length + 1}`,
                      Cost_Center_Code: `CC-${100 + costCenters.length + 1}`,
                      Center_Type: 'External Work',
                      Budget_Cap: 100000,
                      Owner: 'Leadership Team',
                    };
                    updateState('costCenters', [...costCenters, newCC]);
                  }}
                  className="px-3 py-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Cost Center</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3">Cost Center Name</th>
                        <th className="px-3 py-3">GL Code</th>
                        <th className="px-3 py-3">Center Type</th>
                        <th className="px-4 py-3 text-right">Budget Cap (Original Currency)</th>
                        <th className="px-3 py-3">Owner / Head</th>
                        <th className="px-4 py-3 text-right bg-gray-100/70">Local Budget Cap (Base Currency)</th>
                        <th className="px-3 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {costCenters.map((cc, idx) => {
                        const localBudget = cc.Budget_Cap * config.fxRate;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={cc.Cost_Center}
                                onChange={e => {
                                  const updated = [...costCenters];
                                  updated[idx] = { ...updated[idx], Cost_Center: e.target.value };
                                  updateState('costCenters', updated);
                                }}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={cc.Cost_Center_Code}
                                onChange={e => {
                                  const updated = [...costCenters];
                                  updated[idx] = { ...updated[idx], Cost_Center_Code: e.target.value };
                                  updateState('costCenters', updated);
                                }}
                                className="w-24 px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={cc.Center_Type}
                                onChange={e => {
                                  const updated = [...costCenters];
                                  updated[idx] = { ...updated[idx], Center_Type: e.target.value as any };
                                  updateState('costCenters', updated);
                                }}
                                className="px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none cursor-pointer"
                              >
                                <option value="External Work">External Work</option>
                                <option value="Internal Work">Internal Work</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                value={cc.Budget_Cap}
                                onChange={e => {
                                  const updated = [...costCenters];
                                  updated[idx] = { ...updated[idx], Budget_Cap: parseFloat(e.target.value) || 0 };
                                  updateState('costCenters', updated);
                                }}
                                className="w-32 px-2 py-1 text-right bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={cc.Owner}
                                onChange={e => {
                                  const updated = [...costCenters];
                                  updated[idx] = { ...updated[idx], Owner: e.target.value };
                                  updateState('costCenters', updated);
                                }}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs text-[var(--brand)] focus:outline-none"
                              />
                            </td>
                            <td className="px-4 py-2 text-right bg-gray-50/60 font-mono font-bold text-[var(--brand)]">
                              {config.baseCurrencySymbol}{localBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => {
                                  if (costCenters.length <= 1) return;
                                  const updated = costCenters.filter((_, i) => i !== idx);
                                  updateState('costCenters', updated);
                                }}
                                className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                title="Remove cost center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 7: RAW_ASANA
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'RAW_ASANA' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Raw Asana Timesheets Stage (Automated Power Automate Landing Zone)
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Maintains the immutable append-only trail of operational timesheets. Any modifications or sync events automatically trigger reactive validation across the entire workbook.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCsvTarget('asana');
                      setShowBulkCsvModal(true);
                    }}
                    className="px-3 py-1.5 bg-white border border-[var(--border)] text-[var(--brand)] rounded-lg text-xs font-medium cursor-pointer shadow-xs hover:bg-[var(--bg)] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Import Asana CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      const newLog: RawAsanaLog = {
                        Asana_Sync_ID: `ASN-${Date.now().toString().slice(-4)}`,
                        Employee: employees[0]?.Employee || 'Alice Chen',
                        Date: new Date().toISOString().split('T')[0],
                        Project: projects[0]?.Project || 'Apex Core ERP Modernization',
                        Task: 'Ad-hoc project delivery task',
                        Hours: 8,
                        Approved: 'Approved',
                        Sync_Timestamp: new Date().toISOString(),
                      };
                      updateState('asana', [...asanaLogs, newLog]);
                    }}
                    className="px-3 py-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Raw Timesheet</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-3 py-2.5">Sync ID</th>
                        <th className="px-3 py-2.5">Employee</th>
                        <th className="px-2.5 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Project</th>
                        <th className="px-4 py-2.5">Task Name</th>
                        <th className="px-2.5 py-2.5 text-right">Hours</th>
                        <th className="px-3 py-2.5">Approval Status</th>
                        <th className="px-3 py-2.5">Sync Timestamp</th>
                        <th className="px-2.5 py-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {asanaLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]">
                            {log.Asana_Sync_ID}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={log.Employee}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Employee: e.target.value };
                                updateState('asana', updated);
                              }}
                              className="w-36 px-2 py-0.5 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-2.5 py-2">
                            <input
                              type="date"
                              value={log.Date}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Date: e.target.value };
                                updateState('asana', updated);
                              }}
                              className="px-1.5 py-0.5 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={log.Project}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Project: e.target.value };
                                updateState('asana', updated);
                              }}
                              className="w-48 px-2 py-0.5 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-medium text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={log.Task}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Task: e.target.value };
                                updateState('asana', updated);
                              }}
                              className="w-full px-2 py-0.5 bg-[var(--input-bg)] border border-amber-200 rounded text-xs text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-2.5 py-2 text-right">
                            <input
                              type="number"
                              step="0.5"
                              value={log.Hours}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Hours: parseFloat(e.target.value) || 0 };
                                updateState('asana', updated);
                              }}
                              className="w-16 px-1.5 py-0.5 text-right bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono font-semibold text-[var(--brand)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={log.Approved}
                              onChange={e => {
                                const updated = [...asanaLogs];
                                updated[idx] = { ...updated[idx], Approved: e.target.value };
                                updateState('asana', updated);
                              }}
                              className="px-2 py-0.5 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-semibold focus:outline-none cursor-pointer"
                            >
                              <option value="Approved">Approved</option>
                              <option value="Unapproved">Unapproved</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
                            {log.Sync_Timestamp ? log.Sync_Timestamp.split('T')[0] : 'Manual'}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <button
                              onClick={() => {
                                const updated = asanaLogs.filter((_, i) => i !== idx);
                                updateState('asana', updated);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 8: RAW_MEETING
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'RAW_MEETING' && (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                    Raw Meetings & Implicit Calendar Overhead Calculator (Teams / Outlook Sync)
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Identifies project meetings via keyword matching with <code className="font-mono bg-white px-1 rounded border border-[var(--border)]">PROJECT_MAP!Meeting_Keyword</code>, discounts raw hours using the effective coefficient (<strong className="text-[var(--brand)]">{config.meetingWeightFactor * 100}%</strong>), and flags single sessions exceeding {config.maxSingleMeetingHours}h.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">
                    <span className="font-semibold text-[var(--brand)]">Include in Project Cost:</span>
                    <button
                      onClick={() => {
                        const nextVal = config.includeMeetingInCost === 'Y' ? 'N' : 'Y';
                        updateState('config', { ...config, includeMeetingInCost: nextVal });
                      }}
                      className={`px-2 py-0.5 rounded font-bold text-xs cursor-pointer transition-colors ${
                        config.includeMeetingInCost === 'Y'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {config.includeMeetingInCost === 'Y' ? 'ENABLED (Y)' : 'DISABLED (N)'}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const newMtg: RawMeetingLog = {
                        Meeting_ID: `MTG-${Date.now().toString().slice(-4)}`,
                        Employee: employees[0]?.Employee || 'Alice Chen',
                        Meeting_Date: new Date().toISOString().split('T')[0],
                        Meeting_Subject: 'Apex Core Architecture Sync',
                        Duration_Hours: 1.5,
                        Meeting_Category_Tag: 'Client Workshop',
                      };
                      updateState('meetings', [...meetingLogs, newMtg]);
                    }}
                    className="px-3 py-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs transition-opacity flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Meeting Log</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-3 py-2.5">Meeting ID</th>
                        <th className="px-3 py-2.5">Attendee</th>
                        <th className="px-2.5 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-2 py-2.5 text-right">Duration</th>
                        <th className="px-3 py-2.5 bg-gray-100/70">Mapped Project</th>
                        <th className="px-2.5 py-2.5 bg-gray-100/70">Work Type</th>
                        <th className="px-2.5 py-2.5 bg-gray-100/70 text-right">Effective Hours</th>
                        <th className="px-3 py-2.5 bg-gray-100/70 text-right">Estimated Cost</th>
                        <th className="px-2.5 py-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {processedMeetings.map((mtg, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]">
                            {mtg.Meeting_ID}
                          </td>
                          <td className="px-3 py-2 font-medium text-[var(--brand)]">
                            {mtg.Employee}
                          </td>
                          <td className="px-2.5 py-2 font-mono text-xs">
                            {mtg.Meeting_Date}
                          </td>
                          <td className="px-4 py-2 font-medium text-[var(--brand)]">
                            {mtg.Meeting_Subject}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-semibold">
                            {mtg.Duration_Hours.toFixed(1)}h
                          </td>
                          <td className="px-3 py-2 bg-gray-50/60 font-medium text-[var(--brand)]">
                            {mtg.Mapped_Project}
                          </td>
                          <td className="px-2.5 py-2 bg-gray-50/60">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-semibold ${
                              mtg.Meeting_Work_Type === 'Project Meeting'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {mtg.Meeting_Work_Type}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 bg-gray-50/60 text-right font-mono font-semibold text-[var(--accent)]">
                            {mtg.Effective_Meeting_Hours.toFixed(2)}h
                          </td>
                          <td className="px-3 py-2 bg-gray-50/60 text-right font-mono font-bold text-[var(--brand)]">
                            {config.baseCurrencySymbol}{mtg.Meeting_Cost_Estimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <button
                              onClick={() => {
                                const updated = meetingLogs.filter((_, i) => i !== idx);
                                updateState('meetings', updated);
                              }}
                              className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                              title="Delete meeting"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 9: CONFIG (GLOBAL PARAMETERS & TIERED RATE MATRIX)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'CONFIG' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--brand)]/4 border-l-4 border-[var(--accent)] rounded-r-xl">
                <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">
                  Centralized Configuration & Consultant Grade Tier Rate Matrix
                </h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Per the architecture specification, all formulas refer strictly to cells in this sheet. Adjusting any rate or threshold immediately propagates across all 10 sheets with zero page reloads.
                </p>
              </div>

              {/* Consultant Grade Tier Matrix */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="font-eb-garamond text-lg font-bold text-[var(--brand)]">
                      Consultant Grade Tiered Hourly Rate Matrix (CONFIG!$A$15:$B$18)
                    </h2>
                  </div>
                  <span className="text-xs text-[var(--muted)] font-mono">
                    Single Point of Rate Administration
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] divide-y divide-[var(--border)]">
                    <thead className="bg-gray-50/90">
                      <tr>
                        <th className="px-4 py-3">Grade Code</th>
                        <th className="px-4 py-3">Professional Title</th>
                        <th className="px-4 py-3 text-right">Standard Hourly Rate (Original Currency)</th>
                        <th className="px-4 py-3 text-right">Local Hourly Cost (FX Converted)</th>
                        <th className="px-5 py-3">Role Description & Expectations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white font-sans">
                      {config.gradeRates.map((gradeConfig, idx) => {
                        const localRate = gradeConfig.hourlyRate * config.fxRate;
                        return (
                          <tr key={gradeConfig.code} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-mono font-bold text-xs text-[var(--brand)]">
                              {gradeConfig.code}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[var(--brand)]">
                              {gradeConfig.grade}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-mono text-xs text-[var(--muted)]">{config.baseCurrencySymbol}</span>
                                <input
                                  type="number"
                                  value={gradeConfig.hourlyRate}
                                  onChange={e => {
                                    const nextRates = [...config.gradeRates];
                                    nextRates[idx] = { ...nextRates[idx], hourlyRate: parseFloat(e.target.value) || 0 };
                                    updateState('config', { ...config, gradeRates: nextRates });
                                  }}
                                  className="w-28 px-2 py-1 text-right bg-[var(--input-bg)] border border-amber-200 rounded font-mono font-bold text-sm text-[var(--brand)] focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-[var(--accent)] text-sm">
                              {config.baseCurrencySymbol}{localRate.toFixed(2)}/h
                            </td>
                            <td className="px-5 py-3 text-xs text-[var(--muted)]">
                              {gradeConfig.description}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Operational & Threshold Parameters */}
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--border)] bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[var(--accent)]" />
                    <h2 className="font-eb-garamond text-lg font-bold text-[var(--brand)]">
                      Operational Parameters & Governance Thresholds (CONFIG!$B$2:$B$14)
                    </h2>
                  </div>
                  <span className="text-xs text-[var(--muted)] font-mono">
                    13 Active Parameters
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Base Currency Symbol (CONFIG!$B$2)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Display symbol applied to all financial values.</p>
                    <input
                      type="text"
                      value={config.baseCurrencySymbol}
                      onChange={e => updateState('config', { ...config, baseCurrencySymbol: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      FX Conversion Rate (CONFIG!$B$3)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Converts original currency rates to base currency.</p>
                    <input
                      type="number"
                      step="0.05"
                      value={config.fxRate}
                      onChange={e => updateState('config', { ...config, fxRate: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Valid Approval Status (CONFIG!$B$4)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Standard approval required for timesheet ingestion.</p>
                    <input
                      type="text"
                      value={config.validApprovalStatus}
                      onChange={e => updateState('config', { ...config, validApprovalStatus: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-semibold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Max Daily Hours Threshold (CONFIG!$B$5)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Timesheets above this daily limit trigger overtime warnings.</p>
                    <input
                      type="number"
                      value={config.maxDailyHours}
                      onChange={e => updateState('config', { ...config, maxDailyHours: parseFloat(e.target.value) || 12 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Standard Daily Hours (CONFIG!$B$6)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Daily base work standard for capacity calculation.</p>
                    <input
                      type="number"
                      value={config.standardDailyHours}
                      onChange={e => updateState('config', { ...config, standardDailyHours: parseFloat(e.target.value) || 8 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Period Working Days (CONFIG!$B$7)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Number of working business days in the review cycle.</p>
                    <input
                      type="number"
                      value={config.periodWorkingDays}
                      onChange={e => updateState('config', { ...config, periodWorkingDays: parseInt(e.target.value) || 22 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Allowable Date Range (CONFIG!$B$8 - $B$9)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Earliest & latest valid dates for timesheet logs.</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={config.minValidDate}
                        onChange={e => updateState('config', { ...config, minValidDate: e.target.value })}
                        className="w-1/2 px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono"
                      />
                      <span className="text-xs text-[var(--muted)]">to</span>
                      <input
                        type="date"
                        value={config.maxValidDate}
                        onChange={e => updateState('config', { ...config, maxValidDate: e.target.value })}
                        className="w-1/2 px-2 py-1 bg-[var(--input-bg)] border border-amber-200 rounded text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Target Billable Ratio (CONFIG!$B$10)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Project commercial health benchmark (e.g. 0.75 = 75%).</p>
                    <input
                      type="number"
                      step="0.05"
                      value={config.targetBillableRatio}
                      onChange={e => updateState('config', { ...config, targetBillableRatio: parseFloat(e.target.value) || 0.75 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[var(--bg)]/50 p-4 rounded-xl border border-[var(--border)]">
                    <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                      Target Utilization Rate (CONFIG!$B$11)
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-2">Workforce saturation target (e.g. 0.85 = 85%).</p>
                    <input
                      type="number"
                      step="0.05"
                      value={config.targetUtilizationRate}
                      onChange={e => updateState('config', { ...config, targetUtilizationRate: parseFloat(e.target.value) || 0.85 })}
                      className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-amber-200 rounded-lg text-sm font-mono font-bold text-[var(--brand)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW 10: README (IMPLEMENTATION & SOP GUIDE)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'README' && (
            <div className="space-y-6">
              {/* Architecture Topology */}
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-[var(--accent)]" />
                  <h2 className="font-eb-garamond text-2xl font-bold text-[var(--brand)]">
                    Data Pipeline Architecture & Single Source of Truth
                  </h2>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">
                  This console operates on strict unidirectional data flow, enforcing segregation of duties across 5 tiers and 10 workbook sheets:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                  <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                    <span className="font-bold text-[var(--brand)] block mb-1">M0: Control & Config</span>
                    <span className="font-mono text-[11px] text-[var(--accent)] block mb-2">README, CONFIG</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Centralizes L1–L4 consultant rate matrix, currency conversions, and validation thresholds.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                    <span className="font-bold text-[var(--brand)] block mb-1">M1: Master Mapping</span>
                    <span className="font-mono text-[11px] text-[var(--accent)] block mb-2">EMPLOYEE, PROJECT, COSTCENTER</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Establishes organizational hierarchy, consultant grade assignments, and cost center boundaries.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                    <span className="font-bold text-[var(--brand)] block mb-1">M2: Raw Ingestion</span>
                    <span className="font-mono text-[11px] text-[var(--accent)] block mb-2">RAW_ASANA, RAW_MEETING</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Automated landing table for Power Automate pipeline. Preserves historical audit trail.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                    <span className="font-bold text-[var(--brand)] block mb-1">M3: Audit & Master</span>
                    <span className="font-mono text-[11px] text-[var(--accent)] block mb-2">VALIDATION, MASTER_TIMESHEET</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      6-point audit firewall filters anomalies. Master table extracts 100% clean priced records.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                    <span className="font-bold text-[var(--brand)] block mb-1">M4: Executive Cockpit</span>
                    <span className="font-mono text-[11px] text-[var(--accent)] block mb-2">DASHBOARD</span>
                    <p className="text-[11px] text-[var(--muted)]">
                      Zero-pivot instant analytics across projects, consultant grades, and cost center budgets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Audit SOP */}
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 shadow-xs">
                <h3 className="font-eb-garamond text-xl font-bold text-[var(--brand)] mb-3">
                  Non-Technical Executive SOP: 5-Step Weekly Audit Cadence
                </h3>
                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">1</div>
                    <div>
                      <strong className="text-[var(--brand)]">Check Ingestion Timestamps:</strong> Navigate to RAW_ASANA and verify the latest Sync_Timestamp reflects current week entries.
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">2</div>
                    <div>
                      <strong className="text-[var(--brand)]">Verify Audit Alert Banner:</strong> In DASHBOARD, inspect the top banner. If alerts are 0, proceed directly to executive review.
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">3</div>
                    <div>
                      <strong className="text-[var(--brand)]">Remediate Intercepted Records:</strong> In VALIDATION, filter by FAIL. Resolve missing project mappings or click "Approve All Pending" to promote clean logs to the master table.
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">4</div>
                    <div>
                      <strong className="text-[var(--brand)]">Review 3 Management Views:</strong> Examine Project Billable Ratios, Consultant Capacity Saturation (flagging overloaded or underutilized peers), and Cost Center Budget consumption.
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">5</div>
                    <div>
                      <strong className="text-[var(--brand)]">Export Backup & Distribute:</strong> Click "Export Backup" to generate the timestamped JSON archive for audit records.
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting FAQ */}
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 shadow-xs">
                <h3 className="font-eb-garamond text-xl font-bold text-[var(--brand)] mb-3">
                  Operational FAQ & Diagnostic Reference
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-[var(--brand)] block mb-1">Q: Why are my Asana hours not appearing in Master Timesheet?</span>
                    <p className="text-[var(--muted)]">
                      A: The entry has been intercepted by the 6-point firewall in VALIDATION (e.g. status is Unapproved, the project is not yet in PROJECT_MAP, or the employee has no assigned consultant grade).
                    </p>
                  </div>
                  <div className="p-3.5 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-[var(--brand)] block mb-1">Q: How do consultant grade rate adjustments take effect?</span>
                    <p className="text-[var(--muted)]">
                      A: In CONFIG, edit the hourly rate for L1, L2, L3, or L4. The formula instantly cascades through EMPLOYEE_MAP, MASTER_TIMESHEET, and all DASHBOARD cost aggregations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── FOOTER INFORMATION ── */}
      <footer className="bg-white border-t border-[var(--border)] py-5 px-6 xl:px-10 text-center text-xs text-[var(--muted)] flex flex-wrap justify-between items-center max-w-[1400px] w-full mx-auto gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--brand)]">Theseus Workshop</span>
          <span className="text-[var(--muted)]">·</span>
          <span>project-time-tracking-excel-template</span>
        </div>
        <div>
          <span>All data in this tool is stored in your browser's localStorage. The page itself does not retain any user data.</span>
        </div>
      </footer>

      {/* ── RESET CONFIRMATION MODAL ── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[var(--border)] animate-fade-up">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[var(--danger)] mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-eb-garamond text-xl font-bold text-[var(--brand)] mb-2">
              Confirm Complete Data Reset
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">
              This action will reset all 10 workbook sheets back to initial pilot seed data (15 consultants, 6 projects, 4 cost centers). Any customized rates or logs in localStorage will be replaced.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-[var(--danger)] hover:opacity-90 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK CSV IMPORT MODAL ── */}
      {showBulkCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-[var(--border)] animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-eb-garamond text-xl font-bold text-[var(--brand)]">
                  Bulk CSV Timesheet Import
                </h3>
              </div>
              <button
                onClick={() => setShowBulkCsvModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-[var(--brand)] block mb-1.5">
                Target Import Sheet:
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="csvTarget"
                    checked={csvTarget === 'asana'}
                    onChange={() => setCsvTarget('asana')}
                    className="cursor-pointer"
                  />
                  <span>RAW_ASANA (Employee, Date, Project, Task, Hours, Approved)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="csvTarget"
                    checked={csvTarget === 'meetings'}
                    onChange={() => setCsvTarget('meetings')}
                    className="cursor-pointer"
                  />
                  <span>RAW_MEETING (Employee, Date, Subject, Duration)</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-[var(--brand)] block mb-1">
                Paste Comma-Separated CSV Lines:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={
                  csvTarget === 'asana'
                    ? "Alice Chen, 2026-06-25, Apex Core ERP Modernization, Architecture assessment, 8, Approved\nBob Zhang, 2026-06-25, Apex Core ERP Modernization, API route implementation, 7.5, Approved"
                    : "Alice Chen, 2026-06-25, Apex Core ERP Sprint Review, 1.5\nBob Zhang, 2026-06-25, OmniCloud Tech Sync, 1.0"
                }
                className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-mono text-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowBulkCsvModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessBulkCsv}
                disabled={!csvText.trim()}
                className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Parse & Ingest CSV Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
