import { formatPromptDataEntries, type PromptDataEntry } from './shared'

export const SOW_PROMPT_SETTINGS = {
  model: 'glm-4.5-air',
  maxOutputTokens: 3000,
  temperature: 0.7,
} as const

export function buildSowPrompt({
  projectName,
  projectDescription,
  dataEntries,
}: {
  projectName: string
  projectDescription: string
  dataEntries: PromptDataEntry[]
}) {
  const dataContent = formatPromptDataEntries(dataEntries)

  return `คุณคือผู้เชี่ยวชาญด้านการเขียนเอกสาร Statement of Work (SOW) หน้าที่ของคุณคือการสร้างเอกสาร SOW ตามข้อมูลที่ได้รับ โดยต้องยึดโครงสร้าง โทนเสียง และรูปแบบตามข้อกำหนดด้านล่างนี้อย่างเคร่งครัด

**1. โทนเสียงและสไตล์การเขียน (Tone & Style):**
*   ใช้โทนเสียงทางการระดับธุรกิจและเทคโนโลยี (Business & IT Professional Tone) ชัดเจนและตรงไปตรงมา
*   คำศัพท์เฉพาะทางด้านเทคนิคและธุรกิจ ให้เขียนคำภาษาไทยตามด้วยคำภาษาอังกฤษในวงเล็บเสมอ เช่น "การบริหารสินค้าคงคลัง (Inventory Management)"
*   ห้ามใช้สรรพนามบุรุษที่ 1 หรือ 2 ให้เรียกแทนบุคคล/องค์กรตามบทบาททางธุรกิจอย่างเจาะจง เช่น "ผู้จัดจำหน่าย (Supplier)", "ลูกค้า (Customer)", "พนักงานขาย (Sale)" และ "ผู้จัดการคลังสินค้า"
*   การแจกแจงรายละเอียดให้ใช้รูปแบบรายการตัวเลข (Numbered lists) ที่ซ้อนทับกันอย่างเป็นระบบ (เช่น 4.1, 4.1.1)

**2. กฎการจัดรูปแบบและตาราง (Formatting & Tables):**
*   หัวข้อ **Revision History** ต้องใช้รูปแบบตาราง (Table) ประกอบด้วยคอลัมน์: Date, Version, Description, Author, Approver (Approved At)
*   หัวข้อ **6. ผลลัพธ์การส่งมอบ (Deliverables)** ไม่ต้องสร้างตาราง แต่ให้ระบุรายการส่งมอบและใส่ระยะเวลาต่อท้ายข้อความแบบ Inline list (เช่น "สัปดาห์ที่ X (DD Month YYYY)")

**3. โครงสร้างและเทมเพลต Markdown (Master Markdown Template):**
นำข้อมูลมาเติมลงใน Placeholders ตามโครงสร้างนี้ทั้งหมด ห้ามปรับเปลี่ยนลำดับหรือเพิ่มหัวข้อเอง

ข้อมูลโครงการ:
- ชื่อโครงการ: ${projectName}
- รายละเอียดโครงการ: ${projectDescription}

ข้อมูลเพิ่มเติม:
${dataContent || 'ไม่มีข้อมูลเพิ่มเติม'}

สร้างเอกสาร SOW โดยแทนที่ Placeholders ด้วยข้อมูลจริงตามโครงสร้าง Markdown ต่อไปนี้:

# {{Project_Name}}
# STATEMENT OF WORK

### PREPARED BY:
### {{Prepared_By_Company}}
### {{Prepared_By_Email}}

### PREPARED FOR:
### {{Prepared_For_Company}}

### Version: {{Version}}
# Date: {{Date}}

---
เวอร์ชั่น: {{Version}}
อนุมัติโดย: {{Approver_Name}} ({{Approval_Date}})
ตรวจสอบโดย: {{Reviewer_Name}} ({{Review_Date}})

{{Project_Name}} Version {{Version}}
Statement of Work {{Date}}

# Revision History
| Date | Version | Description | Author | Approver (Approved At) |
| :--- | :--- | :--- | :--- | :--- |
| {{Revision_Date}} | {{Revision_Version}} | {{Revision_Description}} | {{Revision_Author}} | {{Revision_Approver}} |

---

# Table of Contents
1. บทนำ (Introduction)
2. รายละเอียดผลิตภัณฑ์ (Product Description)
3. วัตถุประสงค์ของโครงการ (Purpose)
4. ขอบเขตการดำเนินงาน (Scope)
   4.1. ขอบเขตการดำเนินงานประกอบไปด้วย
   4.2. ขอบเขตที่ไม่รวมอยู่ในงานประกอบด้วย
5. วัตถุประสงค์ของโครงการ (Objectives)
6. ผลลัพธ์การส่งมอบ (Deliverables)

---

### 1. บทนำ (Introduction)
{{System_Context}} ระบบ {{System_Name}} เป็นแนวทางการทำงานร่วมกันระหว่างผู้จัดจำหน่าย (Supplier) และลูกค้า (Customer) {{System_Definition}} ซึ่งจะช่วย {{Key_Benefits}}

### 2. รายละเอียดผลิตภัณฑ์ (Product Description)
ระบบ {{System_Name}} คือระบบที่ {{Product_Overview}}

2.1. {{Module_Name_EN_1}} ({{Module_ID_1}}): {{Module_Description_TH_1}}
2.2. {{Module_Name_EN_2}} ({{Module_ID_2}}): {{Module_Description_TH_2}}

### 3. วัตถุประสงค์ของโครงการ (Purpose)
3.1. {{Purpose_Item_1}}
3.2. {{Purpose_Item_2}}

### 4. ขอบเขตการดำเนินงาน (Scope)
ระบบนี้จะถูกใช้งานโดย {{Target_Users}} เพื่อ {{Scope_Overview}}

#### 4.1. ขอบเขตการดำเนินงานประกอบไปด้วย
4.1.1. {{In_Scope_Item_1}}
4.1.2. {{In_Scope_Item_2}}

#### 4.2. ขอบเขตที่ไม่รวมอยู่ในงานประกอบด้วย
4.2.1. {{Out_Of_Scope_Item_1}}

### 5. วัตถุประสงค์ของโครงการ (Objectives)
5.1. {{Objective_Item_1}}
5.2. {{Objective_Item_2}}

### 6. ผลลัพธ์การส่งมอบ (Deliverables)
6.1. {{Deliverable_Document_1}} สัปดาห์ที่ {{Deliverable_Week_1}} ({{Deliverable_Date_1}})
6.2. {{Deliverable_Document_2}} สัปดาห์ที่ {{Deliverable_Week_2}} ({{Deliverable_Date_2}})
6.3. Software Delivery สัปดาห์ที่ {{Software_Delivery_Week}} ({{Software_Delivery_Date}})
   6.3.1. {{Module_Name_EN_1}} ({{Module_ID_1}}): {{Module_Description_TH_1}}
   6.3.2. {{Module_Name_EN_2}} ({{Module_ID_2}}): {{Module_Description_TH_2}}
6.4. User Acceptance Ticket สัปดาห์ที่ {{UAT_Week}} ({{UAT_Date}})
6.5. User Manual สัปดาห์ที่ {{Manual_Week}} ({{Manual_Date}})

เมื่อเขียนครบทุกหัวข้อแล้ว ให้พิมพ์ [DOCUMENT_COMPLETE] ที่บรรทัดสุดท้าย`
}

export function buildSowContinuePrompt({ existingContent }: { existingContent: string }) {
  return `คุณคือผู้เชี่ยวชาญด้านการเขียนเอกสาร Statement of Work (SOW)

เอกสาร SOW ต่อไปนี้ถูกสร้างขึ้นแต่ถูกตัดกลางคัน ให้เขียนต่อจากจุดที่หยุดไว้จนเสร็จสมบูรณ์

กฎสำคัญ:
- ห้ามเขียนซ้ำในส่วนที่มีแล้ว ให้เขียนต่อจากจุดที่ค้างไว้เท่านั้น
- รักษารูปแบบ Markdown, โทนเสียง และสไตล์ให้เหมือนเดิมทุกประการ
- คำศัพท์เทคนิคให้เขียนภาษาไทยตามด้วยภาษาอังกฤษในวงเล็บ
- ใช้รูปแบบรายการตัวเลขซ้อนทับ (เช่น 4.1, 4.1.1) เหมือนเดิม

เนื้อหาที่มีอยู่แล้ว (ห้ามเขียนซ้ำ):
${existingContent}

เขียนต่อจากจุดที่ค้างไว้จนครบทุกหัวข้อ เมื่อเขียนครบแล้วให้พิมพ์ [DOCUMENT_COMPLETE] ที่บรรทัดสุดท้าย:`
}
