'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { thaiHolidays2026 } from '../lib/holidays';
import type { Task, TaskStatus, Priority, Shipment, ShipmentStatus } from '../lib/types';

const taskStatuses: TaskStatus[] = ['Not Started','Progress','Waiting','Review','Done','Paused','Cancelled'];
const priorities: Priority[] = ['Critical','High','Medium','Low','Someday'];
const shipStatuses: ShipmentStatus[] = ['Supplier Confirm','Production','Ready','Booking','Container Loading','ETD','At Sea','ETA','Customs','Warehouse','Completed','Delayed','Cancelled'];
const statusTH: Record<string,string> = {'Not Started':'ยังไม่เริ่ม',Progress:'กำลังดำเนินการ',Waiting:'รอข้อมูล / รอคนอื่น',Review:'รอตรวจสอบ',Done:'เสร็จสิ้น',Paused:'พักไว้',Cancelled:'ยกเลิก'};
const shipTH: Record<string,string> = {'Supplier Confirm':'เมืองนอกคอนเฟิร์ม',Production:'กำลังผลิต',Ready:'สินค้าพร้อม',Booking:'จองเรือ', 'Container Loading':'โหลดตู้', ETD:'เรือออก', 'At Sea':'อยู่ระหว่างเดินเรือ', ETA:'ถึงท่า', Customs:'เคลียร์ศุลกากร', Warehouse:'เข้าโกดัง', Completed:'เสร็จสิ้น', Delayed:'ล่าช้า', Cancelled:'ยกเลิก'};
const today = () => new Date().toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const emptyTask = (): Task => ({id:uid(),title:'',project:'',category:'',priority:'Medium',status:'Not Started',start_date:today(),due_date:'',description:'',progress:0,people:'',tags:'',links:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),completed_at:null,history:['สร้างงาน']});
const emptyShipment = (): Shipment => ({id:uid(),name:'',tag:'',po:'',pi:'',supplier:'',forwarder:'',shipping_line:'',vessel:'',voyage:'',container_no:'',origin_port:'',destination_port:'',supplier_confirm_date:'',forwarder_confirm_date:'',planned_ship_date:'',etd:'',eta:'',actual_departure:'',actual_arrival:'',warehouse_date:'',status:'Supplier Confirm',remark:'',links:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),history:['สร้าง Shipment']});

export default function Home(){
  const router = useRouter();
  const [ready,setReady]=useState(false);
  const [userEmail,setUserEmail]=useState('Local Mode');
  const [tab,setTab]=useState('Dashboard');
  const [tasks,setTasks]=useState<Task[]>([]);
  const [ships,setShips]=useState<Shipment[]>([]);
  const [taskModal,setTaskModal]=useState<Task|null>(null);
  const [shipModal,setShipModal]=useState<Shipment|null>(null);
  const [query,setQuery]=useState('');
  const [filterStatus,setFilterStatus]=useState('All');
  const [calMonth,setCalMonth]=useState(new Date().toISOString().slice(0,7));
  const [cloud,setCloud]=useState(false);
  const [isAdmin,setIsAdmin]=useState(false);

  useEffect(()=>{ init(); },[]);
  async function init(){
    const localMode = localStorage.getItem('toey_local_mode') === '1';
    if(hasSupabaseConfig && supabase && !localMode){
      const {data:{session}} = await supabase.auth.getSession();
      if(!session){ router.push('/login'); return; }
      setUserEmail(session.user.email || 'User'); setCloud(true);
      const {data:profile,error:profileError}=await supabase.from('profiles').select('approval_status,role').eq('id',session.user.id).single();
      if(profileError || !profile){ router.push('/pending'); return; }
      if(profile.approval_status !== 'approved'){ router.push('/pending'); return; }
      setIsAdmin(profile.role === 'admin');
      await loadCloud();
    }else{ loadLocal(); }
    setReady(true);
  }
  function loadLocal(){
    setTasks(JSON.parse(localStorage.getItem('toey_tasks')||'[]'));
    setShips(JSON.parse(localStorage.getItem('toey_shipments')||'[]'));
  }
  function saveLocal(nt:Task[], ns:Shipment[]){
    localStorage.setItem('toey_tasks',JSON.stringify(nt)); localStorage.setItem('toey_shipments',JSON.stringify(ns));
  }
  async function loadCloud(){
    if(!supabase)return;
    const {data:t}=await supabase.from('tasks').select('*').order('created_at',{ascending:false});
    const {data:s}=await supabase.from('shipments').select('*').order('created_at',{ascending:false});
    setTasks((t||[]) as Task[]); setShips((s||[]) as Shipment[]);
  }
  async function persist(nt:Task[], ns:Shipment[]){
    setTasks(nt); setShips(ns); saveLocal(nt,ns);
    if(cloud && supabase){
      await supabase.from('tasks').upsert(nt as any);
      await supabase.from('shipments').upsert(ns as any);
    }
  }
  async function deleteTask(id:string){
    if(!confirm('ลบงานนี้หรือไม่?'))return;
    const nt=tasks.filter(x=>x.id!==id); await persist(nt,ships); if(cloud&&supabase) await supabase.from('tasks').delete().eq('id',id);
  }
  async function deleteShip(id:string){
    if(!confirm('ลบ Shipment นี้หรือไม่?'))return;
    const ns=ships.filter(x=>x.id!==id); await persist(tasks,ns); if(cloud&&supabase) await supabase.from('shipments').delete().eq('id',id);
  }
  async function saveTask(t:Task){
    const old=tasks.find(x=>x.id===t.id); const now=new Date().toLocaleString('th-TH');
    t.updated_at=new Date().toISOString();
    if(old && old.status!==t.status){ t.history=[...(old.history||[]),`${now} เปลี่ยนสถานะ ${statusTH[old.status]} → ${statusTH[t.status]}`]; if(t.status==='Done') t.completed_at=new Date().toISOString(); }
    const nt=old?tasks.map(x=>x.id===t.id?t:x):[t,...tasks]; await persist(nt,ships); setTaskModal(null);
  }
  async function quickTaskStatus(id:string,status:TaskStatus){
    const t=tasks.find(x=>x.id===id); if(!t)return; await saveTask({...t,status});
  }
  async function saveShip(s:Shipment){
    const old=ships.find(x=>x.id===s.id); const now=new Date().toLocaleString('th-TH'); s.updated_at=new Date().toISOString();
    if(old && old.status!==s.status){ s.history=[...(old.history||[]),`${now} เปลี่ยนสถานะ ${shipTH[old.status]} → ${shipTH[s.status]}`]; }
    const ns=old?ships.map(x=>x.id===s.id?s:x):[s,...ships]; await persist(tasks,ns); setShipModal(null);
  }
  async function signOut(){ localStorage.removeItem('toey_local_mode'); if(supabase) await supabase.auth.signOut(); router.push('/login'); }
  function exportJSON(){ const blob=new Blob([JSON.stringify({tasks,shipments:ships,exported_at:new Date().toISOString()},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='toey_workspace_backup.json'; a.click(); }
  function restoreJSON(e:any){ const file=e.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=async()=>{try{const d=JSON.parse(String(reader.result)); await persist(d.tasks||[],d.shipments||[]); alert('Restore สำเร็จ');}catch{alert('ไฟล์ไม่ถูกต้อง')}}; reader.readAsText(file); }

  const stats = useMemo(()=>{
    const open = tasks.filter(t=>!['Done','Cancelled'].includes(t.status)); const td=today(); const soonDate=new Date(); soonDate.setDate(soonDate.getDate()+7); const soon=soonDate.toISOString().slice(0,10);
    return {open:open.length,today:open.filter(t=>t.due_date===td).length,soon:open.filter(t=>t.due_date&&t.due_date>td&&t.due_date<=soon).length,waiting:open.filter(t=>t.status==='Waiting').length,done:tasks.filter(t=>t.status==='Done').length,shipsActive:ships.filter(s=>!['Completed','Cancelled'].includes(s.status)).length,shipsEta:ships.filter(s=>s.eta&&s.eta>=td&&s.eta<=soon).length};
  },[tasks,ships]);
  const shownTasks=tasks.filter(t=>(filterStatus==='All'||t.status===filterStatus)&&[t.title,t.project,t.category,t.description,t.tags,t.people].join(' ').toLowerCase().includes(query.toLowerCase()));
  const shownShips=ships.filter(s=>[s.name,s.tag,s.po,s.pi,s.supplier,s.vessel,s.container_no,s.remark].join(' ').toLowerCase().includes(query.toLowerCase()));

  if(!ready) return <div className="main">Loading...</div>;
  return <div className="app"><aside className="sidebar"><div className="brand">TOEY Workspace</div><div className="sub">Work • Shipment • Calendar</div><div className="nav">{[{k:'Dashboard',l:'🏠 Dashboard'},{k:'My Tasks',l:'✅ My Tasks'},{k:'Shipments',l:'🚢 Shipment / ของเข้า'},{k:'Calendar',l:'📅 Calendar'},{k:'Files & Links',l:'📎 Files & Links'},{k:'Settings',l:'⚙️ Backup / Settings'}].map(n=><button key={n.k} className={tab===n.k?'active':''} onClick={()=>setTab(n.k)}>{n.l}</button>)}{isAdmin&&<button onClick={()=>router.push('/admin')}>👤 Admin Approval</button>}</div><div style={{marginTop:20}} className="muted">{cloud?'Online Supabase':'Local Mode'}<br/>{userEmail}</div><button className="btn secondary" style={{marginTop:12,width:'100%'}} onClick={signOut}>Log Out</button></aside><main className="main"><div className="topbar"><div><div className="title">{tab}</div><div className="muted">ระบบติดตามงานและของเข้าออนไลน์</div></div><div className="row"><span className="badge">● {cloud?'Online':'Local'}</span><button className="btn orange" onClick={()=>setTaskModal(emptyTask())}>+ เพิ่มงาน</button><button className="btn" onClick={()=>setShipModal(emptyShipment())}>+ Shipment</button></div></div>
  {tab==='Dashboard'&&<Dashboard stats={stats} tasks={tasks} ships={ships} onStatus={quickTaskStatus} />}
  {tab==='My Tasks'&&<Tasks tasks={shownTasks} query={query} setQuery={setQuery} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onEdit={setTaskModal} onDelete={deleteTask} onStatus={quickTaskStatus}/>} 
  {tab==='Shipments'&&<Shipments ships={shownShips} query={query} setQuery={setQuery} onEdit={setShipModal} onDelete={deleteShip}/>} 
  {tab==='Calendar'&&<Calendar month={calMonth} setMonth={setCalMonth} tasks={tasks} ships={ships}/>} 
  {tab==='Files & Links'&&<FilesLinks tasks={tasks} ships={ships}/>} 
  {tab==='Settings'&&<Settings exportJSON={exportJSON} restoreJSON={restoreJSON} cloud={cloud}/>} 
  {taskModal&&<TaskModal task={taskModal} setTask={setTaskModal} save={saveTask}/>} {shipModal&&<ShipModal ship={shipModal} setShip={setShipModal} save={saveShip}/>} </main></div>
}
function Dashboard({stats,tasks,ships,onStatus}:any){return <><div className="grid kpi"><K title="งานค้าง" n={stats.open}/><K title="วันนี้" n={stats.today}/><K title="ภายใน 7 วัน" n={stats.soon}/><K title="Waiting" n={stats.waiting}/><K title="Shipment Active" n={stats.shipsActive}/></div><div className="split" style={{marginTop:14}}><div className="card"><div className="between"><h3>งานที่ต้องโฟกัส</h3><span className="muted">Quick Status</span></div><TaskTable tasks={tasks.filter((t:Task)=>!['Done','Cancelled'].includes(t.status)).slice(0,8)} onStatus={onStatus}/></div><div className="card ship-card"><h3>Shipment / เรือใกล้ถึง</h3>{ships.filter((s:Shipment)=>!['Completed','Cancelled'].includes(s.status)).slice(0,6).map((s:Shipment)=><div key={s.id} className="card" style={{boxShadow:'none',marginBottom:8,padding:12}}><b>{s.name||s.tag||'Shipment'}</b><div className="muted">{shipTH[s.status]} • ETD {s.etd||'-'} • ETA {s.eta||'-'}</div><div className="muted">{s.vessel} {s.voyage}</div></div>)}</div></div><div className="compact-widget"><div className="wtop"><b>📋 TOEY Workspace</b><button>ย่อ</button></div><div className="wgrid"><div className="wbox"><span>งานค้าง</span><b>{stats.open}</b></div><div className="wbox"><span>วันนี้</span><b>{stats.today}</b></div><div className="wbox"><span>7 วัน</span><b>{stats.soon}</b></div><div className="wbox"><span>Shipment</span><b>{stats.shipsActive}</b></div></div></div></>}
function K({title,n}:any){return <div className="card"><div className="muted">{title}</div><div className="num">{n}</div></div>}
function Tasks(p:any){return <div className="card"><div className="between"><div className="row"><input placeholder="ค้นหางาน..." value={p.query} onChange={(e:any)=>p.setQuery(e.target.value)}/><select value={p.filterStatus} onChange={(e:any)=>p.setFilterStatus(e.target.value)}><option>All</option>{taskStatuses.map(s=><option key={s} value={s}>{statusTH[s]}</option>)}</select></div></div><TaskTable tasks={p.tasks} onEdit={p.onEdit} onDelete={p.onDelete} onStatus={p.onStatus}/></div>}
function TaskTable({tasks,onEdit,onDelete,onStatus}:any){return <table className="table"><thead><tr><th>Priority</th><th>งาน</th><th>Project</th><th>Deadline</th><th>Status</th><th>Progress</th><th></th></tr></thead><tbody>{tasks.map((t:Task)=><tr key={t.id}><td><span className={`pill priority-${t.priority}`}>{t.priority}</span></td><td><b>{t.title}</b><div className="muted">{t.category}</div></td><td>{t.project}</td><td>{t.due_date||'-'}</td><td><select value={t.status} onChange={e=>onStatus?.(t.id,e.target.value)}>{taskStatuses.map(s=><option key={s} value={s}>{statusTH[s]}</option>)}</select></td><td>{t.progress}%</td><td className="row"><button className="btn secondary" onClick={()=>onEdit?.(t)}>เปิด</button>{onDelete&&<button className="btn warn" onClick={()=>onDelete(t.id)}>ลบ</button>}</td></tr>)}</tbody></table>}
function Shipments(p:any){return <div className="card"><input placeholder="ค้นหา Shipment, PO, Supplier, Vessel..." value={p.query} onChange={(e:any)=>p.setQuery(e.target.value)}/><table className="table"><thead><tr><th>Shipment</th><th>PO/PI</th><th>Supplier</th><th>Vessel</th><th>ETD</th><th>ETA</th><th>Status</th><th></th></tr></thead><tbody>{p.ships.map((s:Shipment)=><tr key={s.id}><td><b>{s.name}</b><div className="muted">{s.tag}</div></td><td>{s.po}<br/><span className="muted">{s.pi}</span></td><td>{s.supplier}</td><td>{s.vessel}<div className="muted">{s.voyage}</div></td><td>{s.etd||'-'}</td><td>{s.eta||'-'}</td><td><span className="pill">{shipTH[s.status]}</span></td><td className="row"><button className="btn secondary" onClick={()=>p.onEdit(s)}>เปิด</button><button className="btn warn" onClick={()=>p.onDelete(s.id)}>ลบ</button></td></tr>)}</tbody></table></div>}
function Calendar({month,setMonth,tasks,ships}:any){const [y,m]=month.split('-').map(Number); const first=new Date(y,m-1,1); const days=new Date(y,m,0).getDate(); const blanks=first.getDay(); const cells=[...Array(blanks).fill(0),...Array.from({length:days},(_,i)=>i+1)]; return <div className="card"><div className="row"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div><div className="calendar" style={{marginTop:12}}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><b key={d}>{d}</b>)}{cells.map((d,i)=>{if(!d)return <div key={i}></div>; const date=`${month}-${String(d).padStart(2,'0')}`; return <div className="day" key={date}><div className="d">{d}</div>{thaiHolidays2026[date]&&<div className="event holiday">{thaiHolidays2026[date]}</div>}{tasks.filter((t:Task)=>t.due_date===date).map((t:Task)=><div key={t.id} className="event">Task: {t.title}</div>)}{ships.filter((s:Shipment)=>s.etd===date||s.eta===date||s.warehouse_date===date).map((s:Shipment)=><div key={s.id} className="event">Ship: {s.name||s.tag}</div>)}</div>})}</div></div>}
function FilesLinks({tasks,ships}:any){const items=[...tasks.map((t:Task)=>({type:'Task',name:t.title,links:t.links})),...ships.map((s:Shipment)=>({type:'Shipment',name:s.name||s.tag,links:s.links}))].filter(x=>x.links); return <div className="card"><h3>Files & Links</h3>{items.map((it:any,i:number)=><div key={i} className="card" style={{boxShadow:'none',marginBottom:8}}><b>{it.type}: {it.name}</b>{it.links.split('\n').map((l:string,idx:number)=><div key={idx}>{l.startsWith('http')?<a href={l} target="_blank">{l}</a>:<span>{l}</span>}</div>)}</div>)}</div>}
function Settings({exportJSON,restoreJSON,cloud}:any){return <div className="card"><h3>Settings</h3><p>Mode: {cloud?'Online Supabase':'Local Storage'}</p><div className="row"><button className="btn" onClick={exportJSON}>Backup JSON</button><label className="btn secondary">Restore JSON<input type="file" accept=".json" onChange={restoreJSON} style={{display:'none'}}/></label></div><p className="muted">ถ้า Deploy ออนไลน์ ให้ตั้งค่า Environment Variables ใน Vercel และรัน SQL ใน Supabase ก่อนใช้งานจริง</p></div>}
function TaskModal({task,setTask,save}:any){const t=task; const upd=(k:string,v:any)=>setTask({...t,[k]:v}); async function uploadFile(e:any){const file=e.target.files?.[0]; if(!file)return; if(!supabase){alert('Local Mode: ให้แนบเป็นลิงก์ไฟล์ก่อน'); return;} const path=`tasks/${t.id}/${Date.now()}_${file.name}`; const {error}=await supabase.storage.from('workspace-files').upload(path,file,{upsert:true}); if(error){alert(error.message);return;} const {data}=supabase.storage.from('workspace-files').getPublicUrl(path); upd('links',`${t.links? t.links+'\n':''}${data.publicUrl}`);} return <div className="modal"><div className="modalbox"><div className="between"><h2>{t.title||'เพิ่มงาน'}</h2><button className="btn secondary" onClick={()=>setTask(null)}>ปิด</button></div><div className="form"><F label="ชื่องาน"><input value={t.title} onChange={e=>upd('title',e.target.value)}/></F><F label="Project"><input value={t.project} onChange={e=>upd('project',e.target.value)}/></F><F label="Category"><input value={t.category} onChange={e=>upd('category',e.target.value)}/></F><F label="Priority"><select value={t.priority} onChange={e=>upd('priority',e.target.value)}>{priorities.map(x=><option key={x}>{x}</option>)}</select></F><F label="Status"><select value={t.status} onChange={e=>upd('status',e.target.value)}>{taskStatuses.map(x=><option key={x} value={x}>{statusTH[x]}</option>)}</select></F><F label="Progress %"><input type="number" min="0" max="100" value={t.progress} onChange={e=>upd('progress',Number(e.target.value))}/></F><F label="Start Date"><input type="date" value={t.start_date} onChange={e=>upd('start_date',e.target.value)}/></F><F label="Deadline"><input type="date" value={t.due_date} onChange={e=>upd('due_date',e.target.value)}/></F><F label="ผู้เกี่ยวข้อง"><input value={t.people} onChange={e=>upd('people',e.target.value)}/></F><F label="Tags"><input value={t.tags} onChange={e=>upd('tags',e.target.value)} placeholder="AUKEY, PO, Shipment"/></F><F label="รายละเอียด" full><textarea value={t.description} onChange={e=>upd('description',e.target.value)}/></F><F label="Upload File / Links" full><input type="file" onChange={uploadFile}/><textarea value={t.links} onChange={e=>upd('links',e.target.value)} placeholder="วางลิงก์ Google Drive, Supabase Storage, Shopee, ฯลฯ แยกบรรทัด"/></F></div><div className="split"><div className="card"><h3>History</h3><div className="timeline">{(t.history||[]).map((h:string,i:number)=><div key={i}>{h}</div>)}</div></div><div className="card"><h3>Completion</h3><p className="muted">Completed at: {t.completed_at||'-'}</p></div></div><button className="btn green" onClick={()=>save(t)}>บันทึก</button></div></div>}
function ShipModal({ship,setShip,save}:any){const s=ship; const upd=(k:string,v:any)=>setShip({...s,[k]:v}); async function uploadFile(e:any){const file=e.target.files?.[0]; if(!file)return; if(!supabase){alert('Local Mode: ให้แนบเป็นลิงก์ไฟล์ก่อน'); return;} const path=`shipments/${s.id}/${Date.now()}_${file.name}`; const {error}=await supabase.storage.from('workspace-files').upload(path,file,{upsert:true}); if(error){alert(error.message);return;} const {data}=supabase.storage.from('workspace-files').getPublicUrl(path); upd('links',`${s.links? s.links+'\n':''}${data.publicUrl}`);} return <div className="modal"><div className="modalbox"><div className="between"><h2>{s.name||'เพิ่ม Shipment'}</h2><button className="btn secondary" onClick={()=>setShip(null)}>ปิด</button></div><div className="form"><F label="Shipment Name"><input value={s.name} onChange={e=>upd('name',e.target.value)} placeholder="Shipment 1 - สั่ง ม.ค. ส่ง ก.พ."/></F><F label="Tag"><input value={s.tag} onChange={e=>upd('tag',e.target.value)} placeholder="SHIP-FEB-01"/></F><F label="PO"><input value={s.po} onChange={e=>upd('po',e.target.value)}/></F><F label="PI"><input value={s.pi} onChange={e=>upd('pi',e.target.value)}/></F><F label="Supplier"><input value={s.supplier} onChange={e=>upd('supplier',e.target.value)}/></F><F label="Forwarder"><input value={s.forwarder} onChange={e=>upd('forwarder',e.target.value)}/></F><F label="Shipping Line"><input value={s.shipping_line} onChange={e=>upd('shipping_line',e.target.value)}/></F><F label="Status"><select value={s.status} onChange={e=>upd('status',e.target.value)}>{shipStatuses.map(x=><option key={x} value={x}>{shipTH[x]}</option>)}</select></F><F label="Vessel"><input value={s.vessel} onChange={e=>upd('vessel',e.target.value)}/></F><F label="Voyage No."><input value={s.voyage} onChange={e=>upd('voyage',e.target.value)}/></F><F label="Container No."><input value={s.container_no} onChange={e=>upd('container_no',e.target.value)}/></F><F label="Origin Port"><input value={s.origin_port} onChange={e=>upd('origin_port',e.target.value)}/></F><F label="Destination Port"><input value={s.destination_port} onChange={e=>upd('destination_port',e.target.value)}/></F><F label="เมืองนอกคอนเฟิร์ม"><input type="date" value={s.supplier_confirm_date} onChange={e=>upd('supplier_confirm_date',e.target.value)}/></F><F label="ชิปปิ้งยืนยันรับ"><input type="date" value={s.forwarder_confirm_date} onChange={e=>upd('forwarder_confirm_date',e.target.value)}/></F><F label="กำหนดวันส่ง"><input type="date" value={s.planned_ship_date} onChange={e=>upd('planned_ship_date',e.target.value)}/></F><F label="ETD เรือออก"><input type="date" value={s.etd} onChange={e=>upd('etd',e.target.value)}/></F><F label="ETA เรือถึงท่า"><input type="date" value={s.eta} onChange={e=>upd('eta',e.target.value)}/></F><F label="Actual Departure"><input type="date" value={s.actual_departure} onChange={e=>upd('actual_departure',e.target.value)}/></F><F label="Actual Arrival"><input type="date" value={s.actual_arrival} onChange={e=>upd('actual_arrival',e.target.value)}/></F><F label="Warehouse Receive"><input type="date" value={s.warehouse_date} onChange={e=>upd('warehouse_date',e.target.value)}/></F><F label="Remark" full><textarea value={s.remark} onChange={e=>upd('remark',e.target.value)}/></F><F label="Upload File / Links" full><input type="file" onChange={uploadFile}/><textarea value={s.links} onChange={e=>upd('links',e.target.value)}/></F></div><div className="card"><h3>History</h3><div className="timeline">{(s.history||[]).map((h:string,i:number)=><div key={i}>{h}</div>)}</div></div><button className="btn green" onClick={()=>save(s)}>บันทึก</button></div></div>}
function F({label,children,full}:any){return <div className={`field ${full?'full':''}`}><label>{label}</label>{children}</div>}
