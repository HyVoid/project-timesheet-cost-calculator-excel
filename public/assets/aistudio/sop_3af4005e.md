# 项目工时归集与成本分析控制台（第三部分：标准台账、管理驾驶舱、交叉核验与日常使用指南）

> **本章节导读**：本部分完成模块三后半部分（唯一可信工时与阶梯成本台账：`MASTER_TIMESHEET`）、模块四（多维管理驾驶舱：`DASHBOARD`）的完整字段与动态数组公式设计，全面引入**顾问职级阶梯费率（`Consultant_Grade` & `Unit_Hourly_Rate`）**核算维度，并附上 **Step 3 内部交叉检验报告** 与 **Step 4 日常使用说明（非技术管理者 SOP 手册）**。

---

## Step 2｜标签页字段设计（续）——第三部分：标准工时台账与管理驾驶舱

### 2.9 Sheet 9：`MASTER_TIMESHEET`（唯一可信标准工时与阶梯成本台账）

* **工作表定位**：全组织唯一的、$100\%$ 经过审批与主数据校验的**标准工时与顾问职级阶梯人工成本台账**。全表 14 列均为**公式生成区（浅灰底色）**，自动从 `VALIDATION` 表中提取 `Validation_Status = "PASS"` 的合规记录，并根据顾问职级阶梯费率完成本位币成本核算。

#### （1）字段设计字典
| 列号 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| A | `Master_Sync_ID`<br>（合规工时流水号） | 文本 | `@` | 不适用 | **公式生成区** | 动态筛选 `VALIDATION` 表中状态为 `"PASS"` 的唯一同步流水号。 |
| B | `Employee`<br>（员工姓名） | 文本 | `@` | 不适用 | **公式生成区** | 合规工时的归属员工姓名。 |
| C | `Employee_ID`<br>（员工标准工号） | 文本 | `@` | 不适用 | **公式生成区** | 合规工时的员工标准工号。 |
| D | `Department`<br>（所属部门） | 文本 | `@` | 不适用 | **公式生成区** | 员工所属业务部门。 |
| E | `Consultant_Grade`<br>（顾问职级） | 文本 | `@` | 不适用 | **公式生成区** | 员工在 `EMPLOYEE_MAP` 中评定的顾问职级（`L1-初级顾问` 至 `L4-总监/合伙人`），决定其工时单价阶梯。 |
| F | `Date`<br>（工时日期） | 日期 | `yyyy-mm-dd` | 不适用 | **公式生成区** | 经校验合规的工时发生日期。 |
| G | `Project`<br>（项目名称） | 文本 | `@` | 不适用 | **公式生成区** | 经校验合法的标准项目名称。 |
| H | `Task`<br>（工作任务） | 文本 | `@` | 不适用 | **公式生成区** | 具体执行的任务明细。 |
| I | `Hours`<br>（有效核准工时） | 数值 | `0.00` | 不适用 | **公式生成区** | 经审批且未超限的有效工时数（小时）。 |
| J | `Cost Center`<br>（归属成本中心） | 文本 | `@` | 不适用 | **公式生成区** | 承接该笔工时成本的财务成本中心。 |
| K | `Billing Type`<br>（计费类型） | 文本 | `@` | 不适用 | **公式生成区** | 该笔工时的商业计费属性（`Billable` / `Non-Billable` / `Internal`）。 |
| L | `Project Category`<br>（项目类别） | 文本 | `@` | 不适用 | **公式生成区** | 该笔工时所属项目的管理分类。 |
| M | `Unit_Hourly_Rate`<br>（本位币阶梯小时费率） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区**<br>（引用 `CONFIG!$B$3` 及 `EMPLOYEE_MAP!F2#`） | 关联 `EMPLOYEE_MAP!F2#` 获取该顾问职级对应的原币阶梯费率，并乘以 `CONFIG!$B$3` 折算为本位币小时成本单价。 |
| N | `Direct_Labor_Cost`<br>（直接项目人工成本） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区** | 单笔工时的直接人工成本（$\text{有效核准工时 } I \times \text{本位币阶梯小时费率 } M$），支撑项目与成本中心阶梯成本核算。 |

#### （2）核心计算字段公式设计

* **字段 `A~L`：合规工时记录全自动抽取列**
  * **起始单元格**：`A2:L2` 各列首行 ｜ **预期溢出范围**：随 `VALIDATION!T2#="PASS"` 记录数自动向下溢出
```excel
// A2 公式（Master_Sync_ID）：
=FILTER(VALIDATION!A2#, VALIDATION!T2#="PASS", "暂无合规记录")

// B2 公式（Employee）：
=FILTER(VALIDATION!B2#, VALIDATION!T2#="PASS", "")

// C2 公式（Employee_ID，D2 对应 VALIDATION!I2#）：
=FILTER(VALIDATION!H2#, VALIDATION!T2#="PASS", "")

// E2 公式（Consultant_Grade 顾问职级）：
=FILTER(VALIDATION!J2#, VALIDATION!T2#="PASS", "")

// F2 公式（Date，G2~I2 分别对应 VALIDATION!D2#、E2#、F2#）：
=FILTER(VALIDATION!C2#, VALIDATION!T2#="PASS", "")

// J2 公式（Cost Center，K2~L2 分别对应 VALIDATION!L2#、M2#）：
=FILTER(VALIDATION!K2#, VALIDATION!T2#="PASS", "")
```
  * **分析应用**：通过 `FILTER` 绑定 `VALIDATION!T2#="PASS"`，构建“零脏数据”的财务级标准工时台账，一旦异常在映射表被修复，记录自动流入本表。

* **字段 `M`：`Unit_Hourly_Rate`（本位币阶梯小时费率）**
  * **起始单元格**：`M2` ｜ **预期溢出范围**：与 `A2#` 行数自动对齐
```excel
=XLOOKUP(B2#, EMPLOYEE_MAP!$A$2:$A$100, EMPLOYEE_MAP!$F$2#, 0) * CONFIG!$B$3
```
  * **分析应用**：通过“员工 $\rightarrow$ 顾问职级 $\rightarrow$ `CONFIG` 阶梯费率 $\times$ 汇率”链路自动得出本位币小时单价，支持财务审计不同职级顾问在项目中的投入结构。

* **字段 `N`：`Direct_Labor_Cost`（直接项目人工成本）**
  * **起始单元格**：`N2` ｜ **预期溢出范围**：与 `A2#` 行数自动对齐
```excel
=I2# * M2#
```
  * **分析应用**：将每笔工时按顾问职级阶梯单价直接转化为财务成本金额，彻底打通从“业务工时记录”到“项目阶梯成本归集”的最后一公里。

---

### 2.10 Sheet 10：`DASHBOARD`（多维管理驾驶舱）

* **工作表定位**：面向 CEO、PMO 及业务负责人的免刷新分析看板。全表分为 **全局审计监控卡（`B3`）**、**模块一：项目成本与计费视图（`A6:H6#`）**、**模块二：员工职级、饱和度与利用率视图（`J6:Q6#`）**、**模块三：成本中心归属与预算视图（`S6:X6#`）**，共 23 项核心输出指标。

#### （1）字段设计字典
| 区域与单元格 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **顶部监控卡**<br>`B3` | `Total_Audit_Alert_Count`<br>（全局待处理异常工时总数） | 数值 | `#,##0` | 不适用 | **公式生成区** | 统计 `VALIDATION` 表中状态为 `"FAIL"` 的记录总数；$>0$ 时高亮红灯提醒管理员前往排障。 |
| **项目视图**<br>Col A (`A6#`) | `Dash_Project_List`<br>（分析项目列表） | 文本 | `@` | 不适用 | **公式生成区** | 自动提取 `PROJECT_MAP` 中所有已建档并排序的标准项目名称。 |
| Col B (`B6#`) | `Proj_Asana_Hours`<br>（Asana核准工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总 `MASTER_TIMESHEET` 中各项目的有效核准工时。 |
| Col C (`C6#`) | `Proj_Meeting_Hours`<br>（折算会议工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总 `RAW_MEETING` 中各项目的有效折算会议工时（受 `CONFIG!$B$12` 开关控制）。 |
| Col D (`D6#`) | `Proj_Total_Hours`<br>（项目总投入工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | $\text{Asana核准工时} + \text{折算会议工时}$，反映项目真实总时间消耗。 |
| Col E (`E6#`) | `Proj_Billable_Hours`<br>（项目计费工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总该项目下 `Billing Type = "Billable"` 的有效核准工时。 |
| Col F (`F6#`) | `Proj_Billable_Ratio`<br>（项目计费工时占比） | 数值 | `0.0%` | 不适用 | **公式生成区** | $\text{项目计费工时} / \text{项目总投入工时}$，衡量项目商业化产出效率。 |
| Col G (`G6#`) | `Proj_Billable_Status`<br>（计费比健康度评价） | 文本 | `@` | 不适用 | **公式生成区**<br>（引用 `CONFIG!$B$10`） | 对比 `CONFIG!$B$10`（目标计费比基准），自动标注 `"达标"`、`"偏低预警"` 或 `"内部非计费"`。 |
| Col H (`H6#`) | `Proj_Total_Cost`<br>（项目总人工成本） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区** | 汇总 `MASTER_TIMESHEET` 阶梯直接人工成本与 `RAW_MEETING` 会议隐性人工成本之和。 |
| **员工视图**<br>Col J (`J6#`) | `Dash_Employee_List`<br>（在职试点员工列表） | 文本 | `@` | 不适用 | **公式生成区** | 自动提取 `EMPLOYEE_MAP` 中状态为 `"Active"` 的试点员工名单。 |
| Col K (`K6#`) | `Emp_Consultant_Grade`<br>（顾问职级） | 文本 | `@` | 不适用 | **公式生成区** | 展示每位员工当前的顾问职级（`L1`~`L4`），辅助管理层结合职级高低审视其饱和度与产出合理性。 |
| Col L (`L6#`) | `Emp_Standard_Capacity`<br>（周期标准可用工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区**<br>（引用 `CONFIG!$B$6:$B$7`） | $\text{单日标准工时 CONFIG!\$B\$6} \times \text{周期工作天数 CONFIG!\$B\$7}$，得出每位员工周期额定产能。 |
| Col M (`M6#`) | `Emp_Approved_Hours`<br>（员工Asana核准工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总该员工在 `MASTER_TIMESHEET` 中的核准总工时。 |
| Col N (`N6#`) | `Emp_Meeting_Hours`<br>（员工有效会议工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总该员工在 `RAW_MEETING` 中的有效项目会议工时。 |
| Col O (`O6#`) | `Emp_Utilization_Rate`<br>（员工资源利用率） | 数值 | `0.0%` | 不适用 | **公式生成区** | $(\text{员工Asana核准工时} + \text{员工有效会议工时}) / \text{周期标准可用工时}$，衡量人员负荷饱和度。 |
| Col P (`P6#`) | `Emp_Utilization_Status`<br>（员工负荷状态诊断） | 文本 | `@` | 不适用 | **公式生成区**<br>（引用 `CONFIG!$B$11`） | 对比 `CONFIG!$B$11`（目标利用率基准）：$>100\%$ 为 `"超负荷"`，$\ge\text{目标值}$ 为 `"健康饱和"`，否则 `"产能闲置"`。 |
| Col Q (`Q6#`) | `Emp_Primary_Project_Dist`<br>（主力投入项目成本中心） | 文本 | `@` | 不适用 | **公式生成区** | 自动识别该员工投入工时归属的成本中心，辅助跨部门借调审计。 |
| **成本中心视图**<br>Col S (`S6#`) | `Dash_CostCenter_List`<br>（成本中心列表） | 文本 | `@` | 不适用 | **公式生成区** | 自动提取 `COSTCENTER_MAP` 中所有已定义的成本中心。 |
| Col T (`T6#`) | `CC_Center_Type`<br>（内外部工时属性） | 文本 | `@` | 不适用 | **公式生成区** | 映射 `External Work`（外部交付）或 `Internal Work`（内部支撑），分析内外部资源配比。 |
| Col U (`U6#`) | `CC_Allocated_Hours`<br>（归集总工时） | 数值 | `#,##0.00` | 不适用 | **公式生成区** | 汇总归属到该成本中心的所有有效核准工时。 |
| Col V (`V6#`) | `CC_Allocated_Cost`<br>（归集总人工成本） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区** | 汇总归属到该成本中心的按顾问职级阶梯核算的直接人工成本总额。 |
| Col W (`W6#`) | `CC_Budget_Cap`<br>（本位币预算上限） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区** | 从 `COSTCENTER_MAP!F2#` 引入该成本中心的本位币周期预算上限。 |
| Col X (`X6#`) | `CC_Budget_Consumption_Rate`<br>（预算消耗率） | 数值 | `0.0%` | 不适用 | **公式生成区** | $\text{归集总人工成本} / \text{本位币预算上限}$，监控各成本中心是否因高职级顾问超额投入而导致预算超支。 |

#### （2）核心计算字段公式设计

* **全局审计监控卡 `B3`：`Total_Audit_Alert_Count`（待处理异常工时总数）**
```excel
=COUNTIF(VALIDATION!T2#, "FAIL")
```
  * **分析应用**：管理者打开看板第一眼即可确认是否存在被拦截的未审批、未配置顾问职级或映射错误工时，保障看板数据可信度。

* **模块一：项目成本与计费视图（`A6:H6#`）**
```excel
// A6 公式（Dash_Project_List）：
=SORT(FILTER(PROJECT_MAP!A2:A100, PROJECT_MAP!A2:A100<>""))

// B6 公式（Proj_Asana_Hours）：
=SUMIFS(MASTER_TIMESHEET!I2#, MASTER_TIMESHEET!G2#, A6#)

// C6 公式（Proj_Meeting_Hours）：
=SUMIFS(RAW_MEETING!J2#, RAW_MEETING!G2#, A6#)

// D6 公式（Proj_Total_Hours）：
=B6# + C6#

// E6 公式（Proj_Billable_Hours）：
=SUMIFS(MASTER_TIMESHEET!I2#, MASTER_TIMESHEET!G2#, A6#, MASTER_TIMESHEET!K2#, "Billable")

// F6 公式（Proj_Billable_Ratio）：
=IFERROR(E6# / D6#, 0)

// G6 公式（Proj_Billable_Status）：
=IFS(XLOOKUP(A6#, PROJECT_MAP!A2:A100, PROJECT_MAP!D2:D100)="Internal", "内部非计费项目", F6#>=CONFIG!$B$10, "达标", TRUE, "偏低预警")

// H6 公式（Proj_Total_Cost）：
=SUMIFS(MASTER_TIMESHEET!N2#, MASTER_TIMESHEET!G2#, A6#) + SUMIFS(RAW_MEETING!K2#, RAW_MEETING!G2#, A6#)
```
  * **分析应用**：一套溢出公式自动生成所有项目的工时结构、计费比达标情况及基于顾问职级阶梯费率计算的全口径人工成本。

* **模块二：员工职级、饱和度与利用率视图（`J6:Q6#`）**
```excel
// J6 公式（Dash_Employee_List）：
=SORT(FILTER(EMPLOYEE_MAP!A2:A100, EMPLOYEE_MAP!E2:E100="Active"))

// K6 公式（Emp_Consultant_Grade 顾问职级）：
=XLOOKUP(J6#, EMPLOYEE_MAP!A2:A100, EMPLOYEE_MAP!D2:D100, "")

// L6 公式（Emp_Standard_Capacity）：
=IF(J6#<>"", CONFIG!$B$6 * CONFIG!$B$7, 0)

// M6 公式（Emp_Approved_Hours）：
=SUMIFS(MASTER_TIMESHEET!I2#, MASTER_TIMESHEET!B2#, J6#)

// N6 公式（Emp_Meeting_Hours）：
=SUMIFS(RAW_MEETING!J2#, RAW_MEETING!B2#, J6#)

// O6 公式（Emp_Utilization_Rate）：
=IFERROR((M6# + N6#) / L6#, 0)

// P6 公式（Emp_Utilization_Status）：
=IFS(O6#>1, "超负荷(>100%)", O6#>=CONFIG!$B$11, "健康饱和", TRUE, "产能闲置")

// Q6 公式（Emp_Primary_Project_Dist）：
=XLOOKUP(J6#, MASTER_TIMESHEET!B2#, MASTER_TIMESHEET!J2#, "暂无工时归属")
```
  * **分析应用**：帮助团队负责人结合成员的顾问职级（`L1`~`L4`）审视其工作负荷与会议时间侵占比例，避免高成本的 `L3/L4` 专家产能闲置或被过多会议消耗。

* **模块三：成本中心归属与预算视图（`S6:X6#`）**
```excel
// S6 公式（Dash_CostCenter_List）：
=FILTER(COSTCENTER_MAP!A2:A50, COSTCENTER_MAP!A2:A50<>"")

// T6 公式（CC_Center_Type）：
=XLOOKUP(S6#, COSTCENTER_MAP!A2:A50, COSTCENTER_MAP!C2:C50, "")

// U6 公式（CC_Allocated_Hours）：
=SUMIFS(MASTER_TIMESHEET!I2#, MASTER_TIMESHEET!J2#, S6#)

// V6 公式（CC_Allocated_Cost）：
=SUMIFS(MASTER_TIMESHEET!N2#, MASTER_TIMESHEET!J2#, S6#)

// W6 公式（CC_Budget_Cap）：
=XLOOKUP(S6#, COSTCENTER_MAP!A2:A50, COSTCENTER_MAP!F2#, 0)

// X6 公式（CC_Budget_Consumption_Rate）：
=IFERROR(V6# / W6#, 0)
```
  * **分析应用**：自动实现“项目 $\rightarrow$ 成本中心”的财务归集，清晰对比内部支撑（`Internal Work`）与外部交付（`External Work`）的阶梯人工资金消耗及预算剩余空间。

---

## Step 3｜交叉检验与完整性核验（内部自检报告）

完成全部 10 个工作表的架构设计与字段字典后，按实施规范执行严格的三维交叉核验：

1. **假设输入字段核对（30 / 30 项 $100\%$ 闭环）**：
   * `CONFIG`（3 项）、`EMPLOYEE_MAP`（5 项，含 `Consultant_Grade` 顾问职级）、`PROJECT_MAP`（6 项）、`COSTCENTER_MAP`（5 项）、`RAW_ASANA`（8 项）、`RAW_MEETING`（前 6 列原始输入），共计 30 个独特业务输入字段均已在各自工作表字典中明确定义数据类型、格式、来源与业务规则，无一遗漏。
2. **关键输出字段核对（65 / 65 项 $100\%$ 闭环）**：
   * `EMPLOYEE_MAP`（1 项：`Tiered_Hourly_Rate`）、`COSTCENTER_MAP`（1 项：`Local_Budget_Cap`）、`RAW_MEETING`（5 项）、`VALIDATION`（21 项，含 `Consultant_Grade` 映射与职级费率校验）、`MASTER_TIMESHEET`（14 项，含 `Consultant_Grade` 与 `Unit_Hourly_Rate`）、`DASHBOARD`（23 项，含 `Emp_Consultant_Grade`），共计 65 个公式计算字段均已提供完整的动态数组公式、起始单元格、溢出范围及商业分析解释。
3. **全局参数引用闭环核对（`CONFIG!$B$2:$B$18` 共 17 项参数 $100\%$ 有效引用）**：
   * `CONFIG!$B$2`（本位币符号）已绑定全部金额列格式；
   * `CONFIG!$B$3`（汇率）已在 `COSTCENTER_MAP!F2`、`RAW_MEETING!K2`、`MASTER_TIMESHEET!M2` 中引用；
   * `CONFIG!$B$4`（审批标识）、`$B$5`（工时上限）、`$B$8:$B$9`（有效日期范围）已在 `VALIDATION` N2、R2、S2 中引用；
   * `CONFIG!$B$6:$B$7`（标准日工时与工作天数）、`$B$10`（目标计费比）、`$B$11`（目标利用率）已在 `DASHBOARD` L6、G6、P6 中引用；
   * `CONFIG!$B$12:$B$14`（会议计入开关、折算系数、单次会议上限）已在 `RAW_MEETING` I2、J2 中引用；
   * `CONFIG!$A$15:$B$18`（`L1-初级顾问` 至 `L4-总监/合伙人` 4 档阶梯费率矩阵）已在 `EMPLOYEE_MAP!D:D`（数据验证序列）与 `EMPLOYEE_MAP!F2`（`XLOOKUP` 阶梯费率自动匹配）中完整引用，并通过 `EMPLOYEE_MAP!F2#` 传导至 `RAW_MEETING!K2`、`VALIDATION!P2` 及 `MASTER_TIMESHEET!M2`。无任何硬编码常数，无任何悬空未引用参数。

> **✅ 交叉检验通过**

---

## Step 4｜日常使用说明（面向非技术管理者的操作与维护指南）

### 4.1 使用方式（快速上手）
1. **打开方式**：推荐通过 SharePoint Online / OneDrive 使用 **Excel 桌面客户端（Microsoft 365 版本）** 或网页版打开本文件。打开后默认停留在 `README` 导航页。
2. **数据同步机制**：您无需手动从 Asana 导出 CSV。Power Automate 会在每天凌晨自动将新增工时写入 `RAW_ASANA`，将日历会议写入 `RAW_MEETING`。本工作簿全部采用实时动态公式，**无需点击“数据透视表刷新”**，打开文件即看到最新结果。
3. **切换分析视角（会议工时试点开关与职级费率模拟）**：
   * **会议成本开关**：若管理层希望测试“将 Teams/Outlook 项目会议按参会顾问职级计入项目成本”，请进入 `CONFIG` 表，将 `B12` 单元格（`Include_Meeting_In_Cost`）修改为 **`Y`**；若希望仅统计纯 Asana 工时，只需将 `B12` 修改为 **`N`**。
   * **阶梯费率测算**：若财务或 PMO 希望测算不同职级标准单价对项目利润空间的影响，只需在 `CONFIG` 表 `B15:B18` 中调整 `L1~L4` 的标准小时费率，返回 `DASHBOARD` 即可立即查看更新后的项目总成本与预算消耗率。
4. **操作视觉红线**：全表遵循“**浅蓝色单元格可编辑、浅灰色单元格严禁触碰**”原则。所有浅灰色区域均为自动扩展公式，切勿在浅灰色区域内打字、粘贴或按 Delete 键。

---

### 4.2 标准操作流程（每周/每月管理例会 SOP）

请业务管理员（如 PMO 专员或运营主管）按以下 5 步执行例行工时审计与报告分发：

* **第 1 步：检查自动同步状态（用时 1 分钟）**
  * 切换至 `RAW_ASANA` 标签页，滑至最底部查看 `H` 列（`Sync_Timestamp`），确认最新同步日期为当天或本周。
* **第 2 步：核查全局异常拦截红灯（用时 2 分钟）**
  * 切换至 `DASHBOARD` 标签页，查看左上角 `B3` 单元格（`全局待处理异常工时总数`）。
  * 若数字为 **`0`**，代表所有工时 $100\%$ 合规，直接跳至第 4 步；若数字 **`> 0`**，进入第 3 步排障。
* **第 3 步：定位并修复异常工时（用时 3~5 分钟）**
  * 切换至 `VALIDATION` 标签页，在表头 `T` 列（`Validation_Status`）筛选 **`FAIL`**，查看右侧 `U` 列（`Error_Diagnostic_Msg`）给出的中文诊断原因：
    * 若提示 **`[未建档项目/员工/职级费率]`** 或 **`[缺失有效成本中心]`**：前往 `EMPLOYEE_MAP`（检查员工是否建档、D列是否已选择正确的 `L1~L4` 顾问职级）、`PROJECT_MAP` 或 `COSTCENTER_MAP` 末尾浅蓝色区域补齐映射关系，补充后异常会自动消失。
    * 若提示 **`[未审批]`** 或 **`[工时超限或为0]`**：通知对应项目经理在 Asana 系统中完成审批或更正错误填报。
* **第 4 步：审阅管理驾驶舱三大视图（用时 5 分钟）**
  * 返回 `DASHBOARD` 标签页：
    * 在**项目视图**识别计费比显示为“偏低预警”或人工成本偏高的项目；
    * 在**员工视图**结合 `K` 列（`顾问职级`）关注负荷状态为“超负荷(>100%)”或“产能闲置”的团队成员；
    * 在**成本中心视图**检查各中心 `预算消耗率` 是否临近 $100\%$。
* **第 5 步：导出财务归档台账与管理报告（用时 1 分钟）**
  * 将 `DASHBOARD` 页面直接按 `Ctrl + P` 导出为 PDF 发送给 CEO 及部门主管；
  * 若财务部需要核算底稿，切换至 `MASTER_TIMESHEET` 标签页，复制全表并以“**粘贴为数值**”方式另存为独立 Excel 发送财务。

---

### 4.3 数据维护规范（主数据、顾问职级与参数变更）
1. **如何调整顾问职级阶梯费率或全局参数**：
   * 进入 `CONFIG` 表，在 `B15:B18` 单元格可直接调整 `L1-初级顾问`、`L2-高级顾问`、`L3-专家顾问`、`L4-总监/合伙人` 的标准小时费率；在 `B7` 单元格更新当月实际工作天数。**只需修改 `CONFIG` 表对应单元格，全工作簿所有相关报表自动同步更新**。
2. **如何新增入职员工或调整员工晋升职级**：
   * 进入 `EMPLOYEE_MAP`，在现有浅蓝色列表（A~E列）的**最后一行下方紧接着输入**新员工姓名、工号、部门，并在 `D` 列下拉框中选择其对应的顾问职级（`L1~L4`），在 `E` 列填 `Active`。
   * 右侧浅灰色的 `F` 列（`Tiered_Hourly_Rate`）**会自动向下溢出匹配出对应的阶梯小时费率，切勿在 F 列手动输入数字**。当员工发生晋升时，只需在 `D` 列更改其下拉职级选项，全表费率自动同步更新。
3. **如何新增立项项目或成本中心**：
   * 在 `PROJECT_MAP` 末尾浅蓝色区域新增项目并指定归属成本中心；
   * 在 `COSTCENTER_MAP` 的 A~E 列末尾新增成本中心信息，右侧 `F` 列（`本位币预算上限`）会自动向下扩展计算，切勿手动拖拽或覆盖。

---

### 4.4 使用限制与环境要求
1. **适用业务边界**：专为 **15~50 人规模** 的项目型团队试点设计，数据粒度为“员工-职级-日期-项目-任务”日度流水。
2. **数据量级上限**：建议年度累计工时与会议流水控制在 **50,000 行以内**（15 人团队每年约产生 4,000~6,000 行工时，可流畅运行 3~5 年；建议每年底归档一次历史年度文件）。
3. **软件版本硬性要求**：必须使用 **Microsoft 365（原 Office 365）或 Excel 2021 及以上版本**（需原生支持 `FILTER`、`XLOOKUP`、`UNIQUE`、`SORT` 动态数组引擎）。严禁使用 Excel 2016/2019 或非兼容的第三方表格软件打开并保存，否则会导致动态公式失效。
4. **协同编辑限制**：由于 Power Automate 定时向 `RAW_ASANA` 和 `RAW_MEETING` 写入数据，日常查看时请勿手动在这两张原始表中插入行、删除列或更改表头名称，以免中断 Power Automate 写入连接。

---

### 4.5 常见故障调整指南（FAQ 问答速查）

* **问题 1：公式区突然显示 `#SPILL!`（溢出错误）怎么办？**
  * **原因**：有人在浅灰色的公式自动扩展区域内（例如 `EMPLOYEE_MAP` 的 F 列或 `MASTER_TIMESHEET` 的第 2 行以下）不小心输入了文字或空格，挡住了公式向下自动铺开的通道。
  * **解决步骤**：
    1. 鼠标左键点击显示 `#SPILL!` 的单元格，此时表格中会出现一个**蓝色虚线框**；
    2. 观察蓝色虚线框内部哪一个单元格里有残留的文字或数字；
    3. 选中该阻挡单元格，按键盘上的 `Delete` 键清空内容，公式会瞬间恢复正常显示。

* **问题 2：Power Automate 已经同步了最新工时，为什么 `DASHBOARD` 和 `MASTER_TIMESHEET` 里没有显示这笔工时？**
  * **原因**：该笔工时未通过 6 道审计防线，被 `VALIDATION` 校验引擎自动拦截了（例如还在 Pending 未审批状态、员工未在 `EMPLOYEE_MAP` 配置顾问职级，或项目属于新立项尚未加入 `PROJECT_MAP`）。
  * **解决步骤**：
    1. 查看 `DASHBOARD` 的 `B3` 单元格（异常工时总数是否大于 0）；
    2. 打开 `VALIDATION` 表，在 `T` 列筛选 `FAIL`，查看 `U` 列提示的具体拦截原因；
    3. 若提示 `[未建档项目/员工/职级费率]`，去 `EMPLOYEE_MAP` 检查员工是否已选定 `L1~L4` 职级，或去 `PROJECT_MAP` 补录该项目名称与成本中心，补齐后数据会立即自动出现在 `MASTER_TIMESHEET` 和 `DASHBOARD` 中。

* **问题 3：我在 `CONFIG` 表修改了某一顾问职级的阶梯费率或会议开关，但看板数字没有立刻变化怎么办？**
  * **原因**：某位同事此前将 Excel 的计算模式从“自动”改为了“手动重算”。
  * **解决步骤**：
    1. 点击 Excel 顶部菜单栏的 **【公式】（Formulas）** 选项卡；
    2. 点击右侧的 **【计算选项】（Calculation Options）**；
    3. 勾选 **【自动】（Automatic）**（或直接按键盘快捷键 `F9`），全表数字即刻完成刷新。

* **问题 4：金额列的货币符号显示异常，或者想从人民币 `¥` 切换为美元 `$` 怎么办？**
  * **原因**：本位币设置或单元格数字格式需要同步调整。
  * **解决步骤**：
    1. 进入 `CONFIG` 表，将 `B2` 单元格修改为您需要的货币符号（如 `$`），并在 `B3` 填入对应的结算汇率；
    2. 若部分列仍显示旧符号，选中该金额列，按 `Ctrl + 1` 打开单元格格式 $\rightarrow$ 选择【货币】或【自定义】，将货币符号选为对应币种即可。