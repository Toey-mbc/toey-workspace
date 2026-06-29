TOEY Workspace Complete v1.1 - Admin Approval

สิ่งที่เพิ่มในเวอร์ชันนี้
- Login / Sign Up / Log Out
- ระบบสมัครสมาชิกแล้วรอ Admin อนุมัติ
- หน้า Admin Approval สำหรับอนุมัติ / Reject / ตั้ง Admin
- ปุ่มตั้งบัญชีแรกเป็น Admin คนแรก
- แก้ปัญหา SQL Error: column "user_id" does not exist
- Dashboard / Tasks / Shipments / Vessel ETD-ETA / Calendar / Files & Links / Upload / Backup

วิธีรัน Local
1) แตก ZIP
2) เข้าโฟลเดอร์ toey-workspace
3) ติดตั้ง dependencies:
   npm install
4) copy .env.example เป็น .env.local
5) ใส่ค่า Supabase:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
6) รัน:
   npm run dev
7) เปิด http://localhost:3000

วิธีตั้งค่า Supabase
1) เปิด Supabase Project
2) ไปที่ SQL Editor
3) Copy เนื้อหาในไฟล์ supabase_schema.sql ทั้งหมดไปรัน
4) ไปที่ Authentication > Providers > Email
   - ถ้าต้องการทดสอบง่าย ปิด Confirm email ชั่วคราวได้
   - ถ้าเปิด Confirm email ผู้ใช้ต้องยืนยันอีเมลก่อน Login
5) ไปที่ Storage ตรวจว่ามี bucket ชื่อ workspace-files

วิธีสร้าง Admin คนแรก
1) เข้าเว็บ TOEY Workspace
2) Sign Up ด้วยอีเมลของ Admin
3) Login ถ้ายืนยันอีเมลแล้ว
4) ระบบจะพาไปหน้า Pending
5) กดปุ่ม "ตั้งบัญชีนี้เป็น Admin คนแรก"
6) จากนั้นจะเข้า Dashboard ได้

วิธีอนุมัติสมาชิกใหม่
1) สมาชิกใหม่ Sign Up
2) Admin เข้าเมนู Admin Approval
3) กด Approve ให้สมาชิก
4) สมาชิก Refresh หรือ Login ใหม่ แล้วใช้งานได้

Deploy ขึ้น Vercel
1) Upload โปรเจกต์ขึ้น GitHub
2) Import Project เข้า Vercel
3) ตั้ง Environment Variables:
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
4) Deploy

หมายเหตุสำคัญ
- หากเคยรัน SQL เวอร์ชันเก่าแล้ว ให้รัน supabase_schema.sql เวอร์ชันนี้ทับได้เลย
- ไฟล์นี้มีคำสั่ง alter table add column if not exists เพื่อแก้ตารางเก่าที่ไม่มี user_id
