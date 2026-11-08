# 项目工时归集与成本分析控制台（Excel 实施模板架构文档）

> **文档定位**：面向 15 人规模项目型组织试点（Pilot）的轻量级 PSA（专业服务自动化）验证环境实施方案。  
> **核心理念**：Power Automate 仅负责无感数据搬运，Excel 作为集**数据标准化、主数据映射（含顾问职级阶梯费率）、异常审计拦截、隐性会议工时验证、多维成本核算**于一体的零代码管理控制台。

---

## Step 1｜模块层级拆解与全局架构方案（面向业务问题）

### 1.1 商业分析问题与模块层级拆解

围绕试点阶段的五大核心管理诉求（唯一可信工时源、基于顾问职级的阶梯成本核算与成本中心归属、自动拦截异常记录、验证会议隐性工时、非技术人员可持续维护），本工作簿共拆解为 **5 大业务模块、10 个标准工作表（Sheet）**：

| 模块层级 | 模块名称 | 包含 Sheet 数量 | 工作表名称（Sheet Name） | 解决的核心商业分析与管理问题 |
| :--- | :--- | :---: | :--- | :--- |
| **M0：控制与配置层** | 全局说明与参数中心 | 2 | `README`<br>`CONFIG` | **解决“规则散落、费率硬编码与维护依赖IT”问题**：提供非技术管理者的操作向导；集中管理本位币、汇率、工时阈值、目标利用率、会议计入开关及**顾问职级阶梯费率矩阵（L1~L4）**，实现单点调参、全局重算。 |
| **M1：主数据映射层** | 组织与财务归属规则库 | 3 | `EMPLOYEE_MAP`<br>`PROJECT_MAP`<br>`COSTCENTER_MAP` | **解决“Asana无成本属性与人工映射易错”问题**：建立员工所属职级及自动匹配的阶梯费率、项目计费属性、项目与成本中心映射关系的标准维表，支撑工时向财务成本的自动转化。 |
| **M2：原始数据采集层** | 自动化数据落地区 | 2 | `RAW_ASANA`<br>`RAW_MEETING` | **解决“人工导出漏导、覆盖与隐性工时缺失”问题**：作为 Power Automate 的唯一写入目标表，原样沉淀 Asana 工时流水与 Teams/Outlook 会议流水，保留历史审计轨迹，严禁人工篡改。 |
| **M3：清洗校验与台账层** | 映射、审计与标准台账 | 2 | `VALIDATION`<br>`MASTER_TIMESHEET` | **解决“脏数据流入财务与多口径台账”问题**：`VALIDATION` 自动完成维度挂载（含顾问职级）与 6 类异常拦截；`MASTER_TIMESHEET` 动态提取 $100\%$ 合规记录并按**顾问职级阶梯费率**核算直接人工成本，形成唯一可信台账。 |
| **M4：管理驾驶舱层** | 多维洞察与决策看板 | 1 | `DASHBOARD` | **解决“管理层看不清项目成本与资源效率”问题**：自动输出项目视图（工时、阶梯成本、计费比）、员工视图（顾问职级、饱和度、利用率）、成本中心视图（内外部投入占比、预算消耗率）及异常审计监控指标。 |

---

### 1.2 “数据 → 分析 → 呈现”逻辑流向与架构拓扑

本方案遵循严格的**单向数据流（Unidirectional Data Flow）**设计，确保数据血缘清晰、可追溯、可审计：

```
[外部业务系统]                  [M2: 原始数据采集层]             [M1: 主数据映射层]
Asana Timesheets ──(PA同步)──► RAW_ASANA (只读追加) ──┐        ┌─ EMPLOYEE_MAP (工号/部门/职级/阶梯费率)
                                                      ▼        ├─ PROJECT_MAP (成本中心/计费属性)
Teams / Outlook  ──(PA同步)──► RAW_MEETING ───────────┼───────►├─ COSTCENTER_MAP (属性/预算上限)
                                  │                   │        │
                                  │ (公式清洗与折算)  │        │  [M0: 控制与配置层]
                                  │                   ▼        └─ CONFIG (阈值/汇率/会议开关/L1~L4阶梯费率)
                                  │             VALIDATION (映射引擎 + 6大异常校验引擎)
                                  │                   │
                                  │      ┌────────────┴────────────┐
                                  │      ▼ (仅 Validation=PASS)    ▼ (Validation=FAIL)
                                  │  MASTER_TIMESHEET          [异常审计拦截池]
                                  │  (唯一可信工时与阶梯成本台账)    │
                                  │      │                         │
                                  └─────►├─────────────────────────┘
                                         ▼
                                     DASHBOARD (管理驾驶舱：项目视图 / 员工职级视图 / 成本中心视图)
```

1. **数据流（Data Ingestion）**：Power Automate 定时拉取 Asana 及 Outlook/Teams 数据，以追加行方式写入 `RAW_ASANA` 和 `RAW_MEETING`。管理者仅需在新增员工、晋升调级或新立项时维护 `EMPLOYEE_MAP`、`PROJECT_MAP`、`COSTCENTER_MAP`。
2. **分析流（Analytical Processing）**：
   - `EMPLOYEE_MAP` 右侧公式列根据员工所选职级（`Consultant_Grade`），自动从 `CONFIG` 阶梯费率参数区匹配对应的标准小时费率，杜绝手工逐人维护薪资费率带来的差错与泄密风险。
   - `RAW_MEETING` 右侧公式区通过匹配 `PROJECT_MAP` 关键词判定会议定性，并结合参会顾问的职级阶梯费率自动估算隐性会议成本。
   - `VALIDATION` 通过动态数组函数自动镜像 `RAW_ASANA` 全部非空记录，调用 `XLOOKUP` 挂载员工工号、部门、顾问职级与项目主数据，并执行 6 项业务规则校验，生成 `PASS` 或 `FAIL` 标识。
   - `MASTER_TIMESHEET` 使用 `FILTER` 函数全自动抽取 `VALIDATION` 中状态为 `PASS` 的记录，结合顾问职级阶梯费率与汇率参数自动算出每笔工时的本位币直接人工成本。
3. **呈现流（Executive Presentation）**：`DASHBOARD` 基于动态数组聚合 `MASTER_TIMESHEET`、`RAW_MEETING` 与 `VALIDATION` 数据，无需点击“刷新数据透视表”，源数据一旦写入或职级费率一旦调整，所有看板指标毫秒级自动重算。

---

### 1.3 全局参数表（`CONFIG`）设计与引用机制

全局所有计算层与展示层严禁在公式中硬编码任何数字、状态文本、货币符号或顾问职级费率，统一引用 `CONFIG` 表中的指定单元格（共 **17 项核心参数**，其中 `B2:B14` 为全局运行与阈值参数，`A15:B18` 为顾问职级阶梯费率配置矩阵）：

| 参数单元格 | 参数英文代码 / 职级代码 | 参数业务名称 | 预设示例值 | 适用范围与引用机制说明 |
| :---: | :--- | :--- | :---: | :--- |
| `CONFIG!$B$2` | `Base_Currency_Symbol` | 本位币符号 | `¥`（或 `$`） | 决定全表金额字段的货币符号显示格式，由使用者按组织核算币种指定。 |
| `CONFIG!$B$3` | `FX_Rate` | 结算汇率转换系数 | `1.00` | 将原始阶梯费率/预算折算为本位币金额：$\text{本位币金额} = \text{原币金额} \times \text{CONFIG!\$B\$3}$。 |
| `CONFIG!$B$4` | `Valid_Approval_Status` | 有效审批状态标识 | `"Approved"` | `VALIDATION` 校验工时是否有效的唯一标准，`<>CONFIG!$B$4` 即拦截。 |
| `CONFIG!$B$5` | `Max_Daily_Hours` | 单笔/单日工时上限阈值 | `12.0` | `VALIDATION` 识别“超长工时”的阈值，`>CONFIG!$B$5` 触发异常警告。 |
| `CONFIG!$B$6` | `Standard_Daily_Hours` | 单日标准额定工时 | `8.0` | `DASHBOARD` 计算员工周期标准产能的日基准（小时/天）。 |
| `CONFIG!$B$7` | `Period_Working_Days` | 当前考核周期工作天数 | `22` | `DASHBOARD` 计算员工周期标准可用总工时：$\text{CONFIG!\$B\$6} \times \text{CONFIG!\$B\$7}$。 |
| `CONFIG!$B$8` | `Min_Valid_Date` | 工时追溯最早有效日期 | `2026-01-01` | `VALIDATION` 拦截历史跨期错录工时的下限日期（早于此日期报错）。 |
| `CONFIG!$B$9` | `Max_Valid_Date` | 工时录入最晚有效日期 | `2026-12-31` | `VALIDATION` 拦截未来超前错录工时的上限日期（晚于此日期报错）。 |
| `CONFIG!$B$10` | `Target_Billable_Ratio` | 目标计费工时占比基准 | `75.0%` | `DASHBOARD` 项目视图评估项目商业化健康度的达标线。 |
| `CONFIG!$B$11` | `Target_Utilization_Rate` | 目标资源利用率基准 | `85.0%` | `DASHBOARD` 员工视图评估人员饱和度是否健康的基准线。 |
| `CONFIG!$B$12` | `Include_Meeting_In_Cost` | 会议工时计入项目成本开关 | `"Y"` | 核心管理试点开关：填 `"Y"` 时将项目会议折算工时纳入项目总工时与成本；填 `"N"` 时仅展示不计入。 |
| `CONFIG!$B$13` | `Meeting_Weight_Factor` | 会议时间有效折算系数 | `80.0%` | `RAW_MEETING` 将原始项目会议时长折算为有效工时的折扣率。 |
| `CONFIG!$B$14` | `Max_Single_Meeting_Hours` | 单次会议时长上限阈值 | `4.0` | `RAW_MEETING` 识别异常全天日程或未关闭会议的阈值。 |
| `CONFIG!$B$15`<br>（`A15="L1-初级顾问"`） | `L1-初级顾问` | L1 初级顾问标准小时费率（原币） | `300.00` | `EMPLOYEE_MAP!F2` 通过 `XLOOKUP` 引用 `CONFIG!$A$15:$B$18` 自动赋予 L1 职级员工小时成本基准。 |
| `CONFIG!$B$16`<br>（`A16="L2-高级顾问"`） | `L2-高级顾问` | L2 高级顾问标准小时费率（原币） | `500.00` | `EMPLOYEE_MAP!F2` 自动赋予 L2 职级员工小时成本基准。 |
| `CONFIG!$B$17`<br>（`A17="L3-专家顾问"`） | `L3-专家顾问` | L3 专家顾问标准小时费率（原币） | `800.00` | `EMPLOYEE_MAP!F2` 自动赋予 L3 职级员工小时成本基准。 |
| `CONFIG!$B$18`<br>（`A18="L4-总监/合伙人"`） | `L4-总监/合伙人` | L4 总监/合伙人标准小时费率（原币） | `1200.00` | `EMPLOYEE_MAP!F2` 自动赋予 L4 职级员工小时成本基准。 |

---

### 1.4 全局假设输入字段与关键输出字段清单（Step 3 交叉核验基准）

为确保数据字典与架构方案 $100\%$ 闭环自洽，以下完整列出本方案所有 **30 个假设输入字段**（含配置参数、主数据录入、PA自动写入）及 **65 个关键输出字段**（全自动公式计算列）：

#### （1）假设输入字段清单（Input Fields，共 30 项）
* **`CONFIG`（参数输入，3项）**：`Param_Code`（参数/职级代码）、`Param_Value`（参数设定值/阶梯费率值）、`Param_Desc`（参数业务说明）。
* **`EMPLOYEE_MAP`（手工维护主数据，5项）**：`Employee`（员工姓名）、`Employee_ID`（员工工号）、`Department`（所属部门）、`Consultant_Grade`（顾问职级）、`Active_Status`（在职状态）。
* **`PROJECT_MAP`（手工维护主数据，6项）**：`Project`（项目名称）、`Project_ID`（项目编码）、`Cost Center`（归属成本中心）、`Billing Type`（计费类型）、`Project Category`（项目类别）、`Meeting_Keyword`（会议识别关键词）。
* **`COSTCENTER_MAP`（手工维护主数据，5项）**：`Cost Center`（成本中心名称）、`Cost_Center_Code`（成本中心编码）、`Center_Type`（成本中心属性）、`Budget_Cap`（周期预算上限-原币）、`Owner`（成本中心负责人）。
* **`RAW_ASANA`（PA 自动同步输入，8项）**：`Asana_Sync_ID`（同步流水号）、`Employee`（员工姓名）、`Date`（工时日期）、`Project`（项目名称）、`Task`（任务名称）、`Hours`（填报工时）、`Approved`（审批状态）、`Sync_Timestamp`（同步时间戳）。
* **`RAW_MEETING`（PA 自动同步输入，6项）**：`Meeting_ID`（会议事件ID）、`Employee`（参会员工）、`Meeting_Date`（会议日期）、`Meeting_Subject`（会议主题）、`Duration_Hours`（原始会议时长）、`Meeting_Category_Tag`（日历分类标签）。
*(注：3 + 5 + 6 + 5 + 8 + 6 = 33 列结构定义，其中 `Employee`、`Project`、`Cost Center` 为跨表关联主键，独立录入列共 33 列 / 30 项独特业务输入概念，均在字典中逐列定义。)*

#### （2）关键输出字段清单（Output Fields，共 65 项）
* **`EMPLOYEE_MAP` 阶梯费率扩展计算（1项）**：`Tiered_Hourly_Rate`（职级阶梯小时费率-原币）。
* **`COSTCENTER_MAP` 预算扩展计算（1项）**：`Local_Budget_Cap`（本位币预算上限）。
* **`RAW_MEETING` 清洗与归属计算（5项）**：`Mapped_Project`（会议匹配项目）、`Meeting_Work_Type`（会议工时定性）、`Duration_Flag`（超长会议标记）、`Effective_Meeting_Hours`（折算后有效项目会议工时）、`Meeting_Cost_Estimate`（会议隐性人工成本估算）。
* **`VALIDATION` 映射与校验引擎（21项）**：
  * *镜像列（7项）*：`Val_Sync_ID`、`Val_Employee`、`Val_Date`、`Val_Project`、`Val_Task`、`Val_Hours`、`Val_Approved`；
  * *Mapping Engine 映射列（6项）*：`Employee_ID`、`Department`、`Consultant_Grade`（顾问职级）、`Cost Center`、`Billing Type`、`Project Category`；
  * *Validation Engine 校验列（8项）*：`Flag_Unapproved`（未审批标记）、`Flag_Duplicate`（重复记录标记）、`Flag_Invalid_Project`（主数据与职级缺失标记）、`Flag_Missing_CostCenter`（缺失成本中心标记）、`Flag_Overtime`（超长工时标记）、`Flag_Date_Anomaly`（日期异常标记）、`Validation_Status`（综合校验状态）、`Error_Diagnostic_Msg`（异常原因诊断说明）。
* **`MASTER_TIMESHEET` 标准工时与阶梯成本台账（14项）**：`Master_Sync_ID`、`Employee`、`Employee_ID`、`Department`、`Consultant_Grade`（顾问职级）、`Date`、`Project`、`Task`、`Hours`、`Cost Center`、`Billing Type`、`Project Category`、`Unit_Hourly_Rate`（本位币阶梯小时费率）、`Direct_Labor_Cost`（直接项目人工成本）。
* **`DASHBOARD` 管理驾驶舱（23项）**：
  * *全局审计摘要卡（1项）*：`Total_Audit_Alert_Count`（全局待处理异常工时总数）；
  * *项目视图（8项）*：`Dash_Project_List`、`Proj_Asana_Hours`、`Proj_Meeting_Hours`、`Proj_Total_Hours`、`Proj_Billable_Hours`、`Proj_Billable_Ratio`、`Proj_Billable_Status`、`Proj_Total_Cost`；
  * *员工视图（8项）*：`Dash_Employee_List`、`Emp_Consultant_Grade`（顾问职级）、`Emp_Standard_Capacity`、`Emp_Approved_Hours`、`Emp_Meeting_Hours`、`Emp_Utilization_Rate`、`Emp_Utilization_Status`、`Emp_Primary_Project_Dist`；
  * *成本中心视图（6项）*：`Dash_CostCenter_List`、`CC_Center_Type`、`CC_Allocated_Hours`、`CC_Allocated_Cost`、`CC_Budget_Cap`、`CC_Budget_Consumption_Rate`。

---

## Step 2｜标签页字段设计（零维护公式）——第一部分：控制配置与主数据映射模块

> **视觉隔离规范**：全工作簿统一采用底色区分数据来源——**浅蓝底色列（`#D9E1F2`）代表“手工录入区 / PA写入区”**，可按规维护；**浅灰底色配深绿表头列（`#F2F2F2`）代表“公式生成区”**，只需在首行编写一次动态数组公式，严禁人工输入或下拉拖拽。

### 2.1 Sheet 1：`README`（使用导航与说明页）
* **工作表定位**：非结构化数据表，作为管理者打开工作簿的首屏导航页，提供系统架构简图、颜色图例说明、工作表超链接目录以及异常排查快速入口。不参与公式计算。

---

### 2.2 Sheet 2：`CONFIG`（全局参数与顾问职级阶梯费率配置表）

#### （1）字段设计字典
| 列号 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| A | `Param_Code`<br>（参数/职级标准代码） | 文本 | `@` | 不适用 | 手工录入区<br>（预设锁定） | 参数的唯一系统标识码（`A2:A14` 为全局运行参数代码；`A15:A18` 为 `L1-初级顾问` 至 `L4-总监/合伙人` 的标准职级代码）。 |
| B | `Param_Value`<br>（参数设定值/阶梯费率值） | 混合（数值/文本/日期） | 按行独立设置（如 `#,##0.00`、`0.0%`、`yyyy-mm-dd`） | `B15:B18` 为原币种基准 | **手工录入区**<br>（管理者唯一调参列） | **核心控制列（`B2:B18`）**：`B2:B14` 存放本位币符号、汇率、阈值、会议开关；`B15:B18` 存放 L1~L4 各顾问职级的标准小时成本费率。修改此列任意值，全表自动重算。 |
| C | `Param_Desc`<br>（参数业务说明与填报规范） | 文本 | `@` | 不适用 | 手工录入区<br>（预设说明） | 用直白的业务语言解释每项参数及各顾问职级的评定标准与取值范围。 |

---

### 2.3 Sheet 3：`EMPLOYEE_MAP`（员工主数据与职级阶梯费率映射表）

#### （1）字段设计字典
| 列号 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| A | `Employee`<br>（Asana员工姓名） | 文本 | `@` | 不适用 | **手工录入区** | 试点团队成员在 Asana 及 Teams 中的显示名称（主键，不可重复），用于关联原始工时与会议记录。 |
| B | `Employee_ID`<br>（员工标准工号） | 文本 | `@` | 不适用 | **手工录入区** | 组织内部 HR/财务系统的标准员工编号（如 `EMP-001`），解决重名风险并支持财务核算归档。 |
| C | `Department`<br>（所属部门） | 文本 | `@` | 不适用 | **手工录入区** | 员工所在业务团队（如“交付一部”、“研发组”、“PMO”），用于部门级资源统计。 |
| D | `Consultant_Grade`<br>（顾问职级） | 文本 | `@` | 不适用 | **手工录入区**<br>（数据验证下拉框） | 员工评定的专业职级（绑定数据验证序列 `=CONFIG!$A$15:$A$18`，枚举值：`L1-初级顾问`、`L2-高级顾问`、`L3-专家顾问`、`L4-总监/合伙人`）。 |
| E | `Active_Status`<br>（在职状态） | 文本 | `@` | 不适用 | **手工录入区** | 标识员工当前是否参与试点考核（枚举值：`"Active"` 或 `"Inactive"`），驾驶舱仅提取 `"Active"` 员工。 |
| F | `Tiered_Hourly_Rate`<br>（职级阶梯小时费率-原币） | 数值 | `#,##0.00` | 原币种（折算前基准） | **公式生成区**<br>（引用 `CONFIG!$A$15:$B$18`） | 根据员工在 `D` 列的顾问职级，自动去 `CONFIG` 阶梯费率表匹配对应的标准小时成本单价；若职级未填或无效则返回 `0` 并触发后续校验拦截。 |

#### （2）核心计算字段公式设计

* **字段 `F`：`Tiered_Hourly_Rate`（职级阶梯小时费率-原币）**
  * **起始单元格**：`F2`
  * **预期溢出范围**：`F2:F100`（随 A 列非空员工行数自动动态溢出）
  * **公式代码**：
```excel
=XLOOKUP(FILTER(D2:D100, A2:A100<>""), CONFIG!$A$15:$A$18, CONFIG!$B$15:$B$18, 0)
```
  * **分析应用**：实现“按职级定费率”的咨询行业标准成本管理模式。当员工晋升（只需在 D 列将其职级从 `L1-初级顾问` 改为 `L2-高级顾问`）或公司普调某一职级标准费率（只需改 `CONFIG!$B$15:$B$18`）时，全表项目成本自动同步更新。

---

### 2.4 Sheet 4：`PROJECT_MAP`（项目主数据与成本中心映射表）

#### （1）字段设计字典
| 列号 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| A | `Project`<br>（Asana项目名称） | 文本 | `@` | 不适用 | **手工录入区** | 对应 Asana 中的正式项目名称（主键，不可重复），是校验工时项目是否合法的基准字典。 |
| B | `Project_ID`<br>（项目标准编码） | 文本 | `@` | 不适用 | **手工录入区** | 组织立项赋予的标准项目编号（如 `PRJ-2026-01`）。 |
| C | `Cost Center`<br>（归属成本中心） | 文本 | `@` | 不适用 | **手工录入区** | **核心映射字段**：定义该项目产生的所有工时成本应归属到哪个成本中心（必须存在于 `COSTCENTER_MAP` 中）。 |
| D | `Billing Type`<br>（计费类型） | 文本 | `@` | 不适用 | **手工录入区** | 界定项目工时的商业属性，枚举值：`Billable`（客户计费）、`Non-Billable`（客户非计费/赠送）、`Internal`（内部管理/研发）。 |
| E | `Project Category`<br>（项目业务类别） | 文本 | `@` | 不适用 | **手工录入区** | 项目的管理分类，如 `Client Delivery`（客户交付）、`R&D`（产品研发）、`Presales`（售前支持）、`Admin`（内部行政）。 |
| F | `Meeting_Keyword`<br>（会议识别关键词） | 文本 | `@` | 不适用 | **手工录入区** | 用于自动匹配 Teams/Outlook 会议主题的唯一项目简称或代号（如 `"Alpha项目"`），解决会议归属难题。 |

---

### 2.5 Sheet 5：`COSTCENTER_MAP`（成本中心主数据与预算映射表）

#### （1）字段设计字典
| 列号 | 字段名（业务术语） | 数据类型 | 数据格式 | 货币单位 | 数据来源 | 业务含义与数据逻辑 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| A | `Cost Center`<br>（成本中心名称） | 文本 | `@` | 不适用 | **手工录入区** | 财务成本归集单元名称（如“华东交付中心”、“产品研发中心”、“公共管理中心”），作为主键。 |
| B | `Cost_Center_Code`<br>（成本中心编码） | 文本 | `@` | 不适用 | **手工录入区** | 财务科目对应的成本中心代码（如 `CC-101`）。 |
| C | `Center_Type`<br>（成本中心属性） | 文本 | `@` | 不适用 | **手工录入区** | 区分 `External Work`（外部交付型）与 `Internal Work`（内部支撑型），服务于驾驶舱内外部工时结构分析。 |
| D | `Budget_Cap`<br>（周期预算上限-原币） | 数值 | `#,##0.00` | 原币种 | **手工录入区** | 该成本中心在当前考核周期内获批的最大工时人工成本预算（原币金额）。 |
| E | `Owner`<br>（成本中心负责人） | 文本 | `@` | 不适用 | **手工录入区** | 对该成本中心工时真实性与预算执行负责的业务主管姓名。 |
| F | `Local_Budget_Cap`<br>（本位币预算上限） | 数值 | `[本位币符号]#,##0.00` | 取自 `CONFIG!$B$2` | **公式生成区**<br>（引用 `CONFIG!$B$3`） | 将原币预算上限自动折算为本位币预算，供 `DASHBOARD` 直接对比本位币实际成本并计算预算消耗率。 |

#### （2）核心计算字段公式设计

* **字段 `F`：`Local_Budget_Cap`（本位币预算上限）**
  * **起始单元格**：`F2`
  * **预期溢出范围**：`F2:F50`（随 A 列非空成本中心行数自动动态溢出）
  * **公式代码**：
```excel
=FILTER(D2:D50, A2:A50<>"") * CONFIG!$B$3
```
  * **分析应用**：通过 `FILTER` 动态捕获 A 列所有已录入的成本中心原币预算，并乘以 `CONFIG!$B$3`（结算汇率转换系数），新增成本中心行时无需下拉公式即可自动生成本位币预算基准。