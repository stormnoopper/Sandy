# Sandy

Sandy คือแอปผู้ช่วยจัดการโปรเจกต์ที่ใช้ AI เพื่อพา workflow ตั้งแต่การเก็บข้อมูลโปรเจกต์ ไปจนถึงการสร้างเอกสาร `SOW`, `SRS` และ `Prototype Prompt`

## โครงสร้างโปรเจกต์

โฟลเดอร์หลักที่ควรรู้มีดังนี้

- `app/` เก็บหน้าเว็บและ API Routes ของ Next.js App Router
- `app/page.tsx` หน้าแรกของระบบ ถ้ายังไม่ได้ล็อกอินจะแสดงฟอร์มเข้าสู่ระบบ
- `app/project/[id]/` หน้า workflow ของแต่ละโปรเจกต์ เช่น ดูข้อมูล สร้าง `SOW`, `SRS` และ `Prototype`
- `app/api/` API สำหรับงานฝั่งเซิร์ฟเวอร์ เช่น สมัครสมาชิก และเรียก AI เพื่อ generate เอกสาร
- `components/` React components ของ UI เช่น dashboard, sidebar, auth form และ editor ต่าง ๆ
- `components/ui/` ชุด UI components พื้นฐาน
- `lib/` utility และ logic กลางของระบบ เช่น auth, database, Supabase client และ state ของโปรเจกต์
- `prompts/` prompt templates ที่ใช้ส่งให้ AI สำหรับสร้าง `SOW`, `SRS` และ prototype
- `supabase/` ไฟล์ config และ migrations สำหรับฐานข้อมูล Supabase

ภาพรวมการทำงานของระบบ

1. ผู้ใช้ล็อกอินเข้าสู่ระบบ
2. สร้างโปรเจกต์และเพิ่มข้อมูลประกอบโปรเจกต์
3. ใช้ AI สร้างเอกสาร `SOW`
4. ใช้ `SOW` ไปต่อยอดเป็น `SRS`
5. ใช้ `SRS` เพื่อสร้าง `Prototype Prompt`

## วิธีติดตั้งและเริ่มใช้งาน

### 1. ติดตั้ง dependencies

โปรเจกต์นี้ใช้ `pnpm`

```bash
pnpm install
```

### 2. ตั้งค่า environment variables

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์ แล้วใส่ค่าตามตัวอย่างนี้

```env
DATABASE_URL=your_postgres_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_GENAI_API_KEY=your_google_ai_api_key
KEYWORD=your_register_passcode
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
```

หมายเหตุ

- `DATABASE_URL` ใช้สำหรับเชื่อมต่อ PostgreSQL ที่ระบบ auth ใช้งาน
- `NEXTAUTH_SECRET` ใช้สำหรับ session ของ `next-auth`
- `GOOGLE_GENAI_API_KEY` ใช้เรียก AI เพื่อ generate เอกสาร
- `KEYWORD` คือ passcode สำหรับเปิดให้สมัครสมาชิก
- `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` ใช้เชื่อมต่อ Supabase ฝั่ง client
- หากโปรเจกต์ของคุณยังใช้ชื่อคีย์เดิม สามารถใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แทน publishable key ได้

### 3. เตรียมฐานข้อมูล Supabase

ถ้าพัฒนาแบบ local และมี Supabase CLI ให้รัน Supabase local stack ก่อน แล้ว apply migrations ของโปรเจกต์

```bash
supabase start
supabase db reset
```

ถ้าใช้ Supabase ที่ host ไว้ภายนอก ให้ apply migrations ในโฟลเดอร์ `supabase/migrations/` ไปยังฐานข้อมูลของคุณตาม workflow ที่ใช้อยู่

### 4. รันโปรเจกต์

```bash
pnpm dev
```

จากนั้นเปิด [http://localhost:3000](http://localhost:3000)

### 5. คำสั่งที่ใช้บ่อย

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```
