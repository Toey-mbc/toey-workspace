'use client';

import { useEffect, useMemo, useState } from 'react';
import { deleteRow, insertRow, selectRows, updateRow } from '../services/db';

type Task = {
  id?: string;
  title: string;
  project?: string;
  category?: string;
  priority?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  description?: string;
  progress?: number;
  owner?: string;
  links?: string;
  checklist?: string;
  comments?: string;
  history?: string;
  created_at?: string;
};

type Shipment = {
  id?: string;
  name: string;
  tag?: string;
  supplier?: string;
  po_no?: string;
  pi_no?: string;
  forwarder?: string;
  shipping_line?: string;
  status?: string;
  vessel?: string;
  voyage_no?: string;
  container_no?: string;
  origin_port?: string;
  destination_port?: string;
  etd?: string;
  eta?: string;
  actual_departure?: string;
  actual_arrival?: string;
  warehouse_date?: string;
  remark?: string;
  timeline?: string;
  links?: string;
  created_at?: string;
};

type ShipmentEvent = {
  id?: string;
  shipment_id?: string;
  event_date?: string;
  event_type?: string;
  title?: string;
  detail?: string;
  created_at?: string;
};

type LinkRow = {
  id?: string;
  title: string;
  url?: string;
  ref_type?: string;
  ref_name?: string;
  remark?: string;
  created_at?: string;
};

const PASS = 'toey1234';

const statuses = [
  'ยังไม่เริ่ม',
  'กำลังดำเนินการ',
  'รอข้อมูล / รอคนอื่น',
  'รอตรวจสอบ',
  'เสร็จสิ้น',
  'พักไว้',
  'ยกเลิก'
];

const priorities = ['Critical', 'High', 'Medium', 'Low', 'Someday'];

const shipmentEventTypes = [
  'Supplier Confirm',
  'รับของแล้ว',
  'เลื่อนวันส่ง',
  'เลื่อน ETD',
  'เลื่อน ETA',
  'เรือออกแล้ว',
  'เรือถึงแล้ว',
  'เข้าโกดัง',
  'Customs',
  'Delay',
  'หมายเหตุ'
];

const holidays = [
  ['2026-01-01', 'วันขึ้นปีใหม่'],
  ['2026-01-02', 'วันหยุดพิเศษ'],
  ['2026-02-11', 'วันมาฆบูชา'],
  ['2026-04-06', 'วันจักรี'],
  ['2026-04-13', 'วันสงกรานต์'],
  ['2026-04-14', 'วันสงกรานต์'],
  ['2026-04-15', 'วันสงกรานต์'],
  ['2026-05-01', 'วันแรงงาน'],
  ['2026-05-05', 'วันฉัตรมงคล'],
  ['2026-06-01', 'วันวิสาขบูชา'],
  ['2026-07-27', 'วันอาสาฬหบูชา'],
  ['2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'],
  ['2026-08-12', 'วันแม่แห่งชาติ'],
  ['2026-10-13', 'วันคล้ายวันสวรรคต ร.9'],
  ['2026-10-16', 'วันหยุดพิเศษ'],
  ['2026-10-23', 'วันปิยมหาราช'],
  ['2026-12-05', 'วันพ่อแห่งชาติ'],
  ['2026-12-10', 'วันรัฐธรรมนูญ'],
  ['2026-12-31', 'วันสิ้นปี']
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffDays(d?: string) {
  if (!d) return 9999;
  const a = new Date(today()).getTime();
  const b = new Date(d).getTime();
  return Math.ceil((b - a) / 86400000);
}

function emptyTask(): Task {
  return {
    title: '',
    project: '',
    category: '',
    priority: 'Medium',
    status: 'ยังไม่เริ่ม',
    start_date: today(),
    due_date: '',
    description: '',
    progress: 0,
    owner: '',
    links: '',
    checklist: '',
    comments: '',
    history: ''
  };
}

function emptyShip(): Shipment {
  return {
    name: '',
    tag: '',
    supplier: '',
    po_no: '',
    pi_no: '',
    forwarder: '',
    shipping_line: '',
    status: 'Pending',
    vessel: '',
    voyage_no: '',
    container_no: '',
    origin_port: '',
    destination_port: '',
    etd: '',
    eta: '',
    actual_departure: '',
    actual_arrival: '',
    warehouse_date: '',
    remark: '',
    timeline: 'Supplier Confirm > Production > Booking > ETD > At Sea > ETA > Customs > Warehouse',
    links: ''
  };
}

function emptyEvent(shipmentId = ''): ShipmentEvent {
  return {
    shipment_id: shipmentId,
    event_date: today(),
    event_type: 'หมายเหตุ',
    title: '',
    detail: ''
  };
}

export default function App() {
  const [access, setAccess] = useState(false);
  const [pass, setPass] = useState('');
  const [tab, setTab] = useState('Dashboard');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [ships, setShips] = useState<Shipment[]>([]);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'task' | 'ship' | 'event' | 'link' | null>(null);

  const [editTask, setEditTask] = useState<Task>(emptyTask());
  const [editShip, setEditShip] = useState<Shipment>(emptyShip());
  const [editEvent, setEditEvent] = useState<ShipmentEvent>(emptyEvent());
  const [editLink, setEditLink] = useState<LinkRow>({
    title: '',
    url: '',
    ref_type: 'General',
    ref_name: '',
    remark: ''
  });

  const [widgetMin, setWidgetMin] = useState(false);
  const [scale, setScale] = useState(100);

  useEffect(() => {
    setAccess(localStorage.getItem('toey_pass') === 'yes');
    const sc = Number(localStorage.getItem('toey_scale') || 100);
    setScale(sc);
    document.documentElement.style.setProperty('--scale', String(sc / 100));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--scale', String(scale / 100));
    localStorage.setItem('toey_scale', String(scale));
  }, [scale]);

  useEffect(() => {
    if (access) loadAll();
  }, [access]);

  async function loadAll() {
    setLoading(true);
    const [t, s, e, l] = await Promise.all([
      selectRows('tasks'),
      selectRows('shipments'),
      selectRows('shipment_events'),
      selectRows('workspace_links')
    ]);
    setTasks((t.data || []) as Task[]);
    setShips((s.data || []) as Shipment[]);
    setEvents((e.data || []) as ShipmentEvent[]);
    setLinks((l.data || []) as LinkRow[]);
    setLoading(false);
  }

  function enter() {
    if (pass === PASS) {
      localStorage.setItem('toey_pass', 'yes');
      setAccess(true);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  }

  const stats = useMemo(() => {
    const active = tasks.filter(t => !['เสร็จสิ้น', 'ยกเลิก'].includes(t.status || ''));

    return {
      pending: active.length,
      today: tasks.filter(t => t.due_date === today()).length,
      week: tasks.filter(t => {
        const d = diffDays(t.due_date);
        return d >= 0 && d <= 7;
      }).length,
      waiting: tasks.filter(t => (t.status || '').includes('รอข้อมูล')).length,
      done: tasks.filter(t => t.status === 'เสร็จสิ้น').length,
      ship: ships.filter(s => !['Completed', 'Cancelled'].includes(s.status || '')).length
    };
  }, [tasks, ships]);

  async function saveTask() {
    const row = {
      ...editTask,
      progress: Number(editTask.progress || 0),
      history:
        (editTask.history || '') +
        `\n${new Date().toLocaleString('th-TH')} บันทึกงาน / สถานะ: ${editTask.status}`
    };

    if (editTask.id) await updateRow('tasks', editTask.id, row);
    else await insertRow('tasks', row);

    setModal(null);
    await loadAll();
  }

  async function quickStatus(t: Task, status: string) {
    await updateRow('tasks', t.id!, {
      status,
      progress: status === 'เสร็จสิ้น' ? 100 : t.progress,
      history:
        (t.history || '') +
        `\n${new Date().toLocaleString('th-TH')} เปลี่ยนสถานะเป็น ${status}`
    });

    await loadAll();
  }

  async function saveShip() {
    if (editShip.id) await updateRow('shipments', editShip.id, editShip);
    else await insertRow('shipments', editShip);

    setModal(null);
    await loadAll();
  }

  async function saveEvent() {
    if (!editEvent.shipment_id) {
      alert('กรุณาเลือก Shipment');
      return;
    }

    const row = {
      shipment_id: editEvent.shipment_id,
      event_date: editEvent.event_date || today(),
      event_type: editEvent.event_type || 'หมายเหตุ',
      title: editEvent.title || editEvent.event_type || 'Shipment Event',
      detail: editEvent.detail || ''
    };

    if (editEvent.id) await updateRow('shipment_events', editEvent.id, row);
    else await insertRow('shipment_events', row);

    const ship = ships.find(s => s.id === editEvent.shipment_id);
    if (ship?.id) {
      const patch: any = {};
      if (row.event_type === 'เลื่อน ETD' && row.event_date) patch.etd = row.event_date;
      if (row.event_type === 'เลื่อน ETA' && row.event_date) patch.eta = row.event_date;
      if (row.event_type === 'เรือออกแล้ว' && row.event_date) patch.actual_departure = row.event_date;
      if (row.event_type === 'เรือถึงแล้ว' && row.event_date) patch.actual_arrival = row.event_date;
      if (row.event_type === 'เข้าโกดัง' || row.event_type === 'รับของแล้ว') patch.warehouse_date = row.event_date;
      if (row.event_type === 'รับของแล้ว') patch.status = 'Warehouse';
      if (row.event_type === 'เลื่อนวันส่ง' || row.event_type === 'Delay') patch.status = 'Delay';
      if (Object.keys(patch).length > 0) await updateRow('shipments', ship.id, patch);
    }

    setModal(null);
    await loadAll();
  }

  async function saveLink() {
    if (editLink.id) await updateRow('workspace_links', editLink.id, editLink);
    else await insertRow('workspace_links', editLink);

    setModal(null);
    await loadAll();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ tasks, ships, events, links }, null, 2)], {
      type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'toey-workspace-backup.json';
    a.click();
  }

  if (!access) {
    return (
      <div className="login">
        <div className="loginCard">
          <h1 style={{ fontSize: 42, margin: '0 0 8px' }}>🧭 TOEY Workspace</h1>
          <p className="sub">ระบบติดตามงาน Shipment Calendar และไฟล์อ้างอิงออนไลน์</p>

          <label style={{ fontWeight: 900, display: 'block', marginTop: 26 }}>
            ใส่รหัสผ่านเข้าใช้งาน
          </label>

          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') enter();
            }}
            placeholder="Password"
            style={{ marginTop: 10 }}
          />

          <button className="btn orange" style={{ width: '100%', marginTop: 18 }} onClick={enter}>
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside
        className="sidebar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        <div className="brand">
          🧭 TOEY
          <br />
          Workspace
        </div>

        <div className="sub">Online Database v2.2</div>

        <div className="nav">
          {['Dashboard', 'Tasks', 'Shipments', 'Calendar', 'Files & Links', 'Settings'].map(x => (
            <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>
              {x === 'Dashboard'
                ? '🏠 '
                : x === 'Tasks'
                ? '✅ '
                : x === 'Shipments'
                ? '🚢 '
                : x === 'Calendar'
                ? '📅 '
                : x === 'Files & Links'
                ? '📁 '
                : '⚙️ '}
              {x}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="scaleBox">
            <button onClick={() => setScale(Math.max(80, scale - 10))}>-</button>
            <b>{scale}%</b>
            <button onClick={() => setScale(Math.min(125, scale + 10))}>+</button>
          </div>

          <div className="sub" style={{ marginBottom: 14 }}>
            Display Scale
          </div>

          <button
            className="btn light"
            style={{
              width: '100%',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 800,
              border: 'none'
            }}
            onClick={() => {
              if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
                localStorage.removeItem('toey_pass');
                location.reload();
              }
            }}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="title">{tab}</div>
            <div className="sub">
              {loading ? 'Loading online data...' : 'ข้อมูลเก็บใน Supabase เปิดเครื่องไหนก็เห็นชุดเดียวกัน'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn orange"
              onClick={() => {
                setEditTask(emptyTask());
                setModal('task');
              }}
            >
              + เพิ่มงาน
            </button>

            <button
              className="btn dark"
              onClick={() => {
                setEditShip(emptyShip());
                setModal('ship');
              }}
            >
              + Shipment
            </button>
          </div>
        </div>

        {tab === 'Dashboard' && (
          <>
            <section className="grid kpis">
              <K label="งานค้าง" v={stats.pending} />
              <K label="วันนี้" v={stats.today} />
              <K label="ภายใน 7 วัน" v={stats.week} />
              <K label="รอข้อมูล" v={stats.waiting} />
              <K label="Shipment" v={stats.ship} />
            </section>

            <section className="grid two">
              <div className="card">
                <h3>งานล่าสุด</h3>
                <TaskTable
                  tasks={tasks.slice(0, 8)}
                  onEdit={(t: Task) => {
                    setEditTask(t);
                    setModal('task');
                  }}
                  onDelete={async (t: Task) => {
                    if (confirm('ลบงาน?')) {
                      await deleteRow('tasks', t.id!);
                      loadAll();
                    }
                  }}
                  onStatus={quickStatus}
                />
              </div>

              <div className="card">
                <h3>Shipment ใกล้ถึง</h3>
                {ships.slice(0, 5).map(s => (
                  <div className="card" style={{ boxShadow: 'none', marginBottom: 10 }} key={s.id}>
                    <b>{s.name}</b>
                    <div className="sub">
                      {s.tag} • {s.supplier}
                    </div>
                    <div>
                      🚢 {s.vessel || '-'} {s.voyage_no || ''}
                    </div>
                    <div>
                      ETD: {s.etd || '-'} / ETA: {s.eta || '-'}
                    </div>
                    <span className="badge b-blue">{s.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'Tasks' && (
          <div className="card">
            <h3>My Tasks</h3>
            <TaskTable
              tasks={tasks}
              onEdit={(t: Task) => {
                setEditTask(t);
                setModal('task');
              }}
              onDelete={async (t: Task) => {
                if (confirm('ลบงาน?')) {
                  await deleteRow('tasks', t.id!);
                  loadAll();
                }
              }}
              onStatus={quickStatus}
            />
          </div>
        )}

        {tab === 'Shipments' && (
          <div className="grid">
            {ships.map(s => (
              <ShipmentCard
                key={s.id}
                shipment={s}
                events={events.filter(ev => ev.shipment_id === s.id)}
                onEdit={() => {
                  setEditShip(s);
                  setModal('ship');
                }}
                onDelete={async () => {
                  if (confirm('ลบ Shipment?')) {
                    await deleteRow('shipments', s.id!);
                    loadAll();
                  }
                }}
                onAddEvent={() => {
                  setEditEvent(emptyEvent(s.id));
                  setModal('event');
                }}
                onEditEvent={(ev: ShipmentEvent) => {
                  setEditEvent(ev);
                  setModal('event');
                }}
                onDeleteEvent={async (ev: ShipmentEvent) => {
                  if (confirm('ลบ Event นี้?')) {
                    await deleteRow('shipment_events', ev.id!);
                    loadAll();
                  }
                }}
              />
            ))}
          </div>
        )}

        {tab === 'Calendar' && <Calendar tasks={tasks} ships={ships} events={events} />}

        {tab === 'Files & Links' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Files & Links</h3>
              <button
                className="btn orange"
                onClick={() => {
                  setEditLink({
                    title: '',
                    url: '',
                    ref_type: 'General',
                    ref_name: '',
                    remark: ''
                  });
                  setModal('link');
                }}
              >
                + เพิ่มลิงก์
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ประเภท</th>
                  <th>อ้างอิง</th>
                  <th>Link</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>

              <tbody>
                {links.map(l => (
                  <tr key={l.id}>
                    <td>{l.title}</td>
                    <td>{l.ref_type}</td>
                    <td>{l.ref_name}</td>
                    <td>{l.url ? <a href={l.url} target="_blank">เปิด</a> : '-'}</td>
                    <td>{l.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && (
          <div className="card">
            <h3>Settings / Backup</h3>
            <p>ข้อมูลหลักเก็บใน Supabase Database แล้ว</p>

            <button className="btn dark" onClick={exportJson}>
              Export Backup JSON
            </button>
          </div>
        )}
      </main>

      <Summary stats={stats} min={widgetMin} setMin={setWidgetMin} />

      {modal === 'task' && (
        <TaskModal
          t={editTask}
          setT={setEditTask}
          onClose={() => setModal(null)}
          onSave={saveTask}
        />
      )}

      {modal === 'ship' && (
        <ShipModal
          s={editShip}
          setS={setEditShip}
          onClose={() => setModal(null)}
          onSave={saveShip}
        />
      )}

      {modal === 'event' && (
        <ShipmentEventModal
          ev={editEvent}
          setEv={setEditEvent}
          ships={ships}
          onClose={() => setModal(null)}
          onSave={saveEvent}
        />
      )}

      {modal === 'link' && (
        <LinkModal
          l={editLink}
          setL={setEditLink}
          onClose={() => setModal(null)}
          onSave={saveLink}
        />
      )}
    </div>
  );
}

function K({ label, v }: { label: string; v: number }) {
  return (
    <div className="card kpi-card">
      <div className="kpiLabel">{label}</div>
      <div className="kpiVal">{v}</div>
    </div>
  );
}

function TaskTable({ tasks, onEdit, onDelete, onStatus }: any) {
  return (
    <table>
      <thead>
        <tr>
          <th>Priority</th>
          <th>งาน</th>
          <th>Project</th>
          <th>Deadline</th>
          <th>Status</th>
          <th>Progress</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        {tasks.map((t: Task) => (
          <tr key={t.id}>
            <td>
              <span className="badge b-orange">{t.priority}</span>
            </td>
            <td>
              <b>{t.title}</b>
              <div className="sub">{t.description}</div>
            </td>
            <td>{t.project}</td>
            <td>{t.due_date}</td>
            <td>
              <select value={t.status} onChange={e => onStatus(t, e.target.value)}>
                {statuses.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </td>
            <td>{t.progress || 0}%</td>
            <td>
              <button className="btn light" onClick={() => onEdit(t)}>
                รายละเอียด
              </button>{' '}
              <button className="btn light" onClick={() => onDelete(t)}>
                ลบ
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShipmentCard({ shipment, events, onEdit, onDelete, onAddEvent, onEditEvent, onDeleteEvent }: any) {
  const sortedEvents = [...events].sort((a, b) => String(b.event_date).localeCompare(String(a.event_date)));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>🚢 {shipment.name}</h3>
          <div className="sub">
            {shipment.tag} • PO {shipment.po_no || '-'} • PI {shipment.pi_no || '-'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button className="btn orange" onClick={onAddEvent}>+ Event</button>
          <button className="btn light" onClick={onEdit}>แก้ไข</button>
          <button className="btn light" onClick={onDelete}>ลบ</button>
        </div>
      </div>

      <div className="grid three">
        <div>
          <b>Supplier</b>
          <br />
          {shipment.supplier || '-'}
          <br />
          <b>Forwarder</b>
          <br />
          {shipment.forwarder || '-'}
        </div>

        <div>
          <b>Vessel / Voyage</b>
          <br />
          {shipment.vessel || '-'} / {shipment.voyage_no || '-'}
          <br />
          <b>Container</b>
          <br />
          {shipment.container_no || '-'}
        </div>

        <div>
          <b>ETD / ETA</b>
          <br />
          {shipment.etd || '-'} / {shipment.eta || '-'}
          <br />
          <b>Warehouse</b>
          <br />
          {shipment.warehouse_date || '-'}
        </div>
      </div>

      <p>
        <b>Timeline:</b> {shipment.timeline}
      </p>

      <p className="sub">{shipment.remark}</p>

      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: '0 0 10px' }}>Shipment Events / ประวัติการเปลี่ยนแปลง</h4>
        {sortedEvents.length === 0 && <div className="sub">ยังไม่มี Event</div>}
        {sortedEvents.map((ev: ShipmentEvent) => (
          <div
            key={ev.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 12,
              marginBottom: 8,
              background: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <b>{ev.event_date || '-'}</b> • <span className="badge b-blue">{ev.event_type}</span>
                <div style={{ marginTop: 6 }}><b>{ev.title}</b></div>
                <div className="sub">{ev.detail}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn light" onClick={() => onEditEvent(ev)}>แก้</button>
                <button className="btn light" onClick={() => onDeleteEvent(ev)}>ลบ</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ t, setT, onClose, onSave }: any) {
  return (
    <div className="modalBg">
      <div className="modal">
        <h2>รายละเอียดงาน</h2>

        <div className="form">
          <input placeholder="ชื่องาน" value={t.title} onChange={e => setT({ ...t, title: e.target.value })} />
          <input placeholder="Project" value={t.project || ''} onChange={e => setT({ ...t, project: e.target.value })} />
          <input placeholder="Category" value={t.category || ''} onChange={e => setT({ ...t, category: e.target.value })} />
          <input placeholder="ผู้เกี่ยวข้อง" value={t.owner || ''} onChange={e => setT({ ...t, owner: e.target.value })} />

          <select value={t.priority} onChange={e => setT({ ...t, priority: e.target.value })}>
            {priorities.map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select value={t.status} onChange={e => setT({ ...t, status: e.target.value })}>
            {statuses.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input type="date" value={t.start_date || ''} onChange={e => setT({ ...t, start_date: e.target.value })} />
          <input type="date" value={t.due_date || ''} onChange={e => setT({ ...t, due_date: e.target.value })} />
          <input type="number" placeholder="Progress %" value={t.progress || 0} onChange={e => setT({ ...t, progress: Number(e.target.value) })} />

          <textarea className="full" placeholder="รายละเอียด" value={t.description || ''} onChange={e => setT({ ...t, description: e.target.value })} />
          <textarea className="full" placeholder="Checklist เช่น ขอราคา / ทำ PO / ส่งบัญชี" value={t.checklist || ''} onChange={e => setT({ ...t, checklist: e.target.value })} />
          <textarea className="full" placeholder="Links / Files reference" value={t.links || ''} onChange={e => setT({ ...t, links: e.target.value })} />
          <textarea className="full" placeholder="Comment" value={t.comments || ''} onChange={e => setT({ ...t, comments: e.target.value })} />
          <textarea className="full" placeholder="History" value={t.history || ''} onChange={e => setT({ ...t, history: e.target.value })} />
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn light" onClick={onClose}>ปิด</button>{' '}
          <button className="btn orange" onClick={onSave}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function ShipModal({ s, setS, onClose, onSave }: any) {
  const fields = [
    { key: 'name', label: 'ชื่อ Shipment', type: 'text', placeholder: 'เช่น Shipment 1 - สั่ง ก.ค. ส่ง ส.ค.' },
    { key: 'tag', label: 'Tag / รอบ Shipment', type: 'text', placeholder: 'เช่น SHIP-AUG-01' },
    { key: 'supplier', label: 'Supplier', type: 'text', placeholder: 'เช่น AUKEY / EarFun' },
    { key: 'po_no', label: 'เลขที่ PO', type: 'text', placeholder: 'เช่น MBCEFPO2600001' },
    { key: 'pi_no', label: 'เลขที่ PI', type: 'text', placeholder: 'เช่น PI20260001' },
    { key: 'forwarder', label: 'Shipping Agent / Forwarder', type: 'text', placeholder: 'เช่น ABC Logistics' },
    { key: 'shipping_line', label: 'สายเรือ', type: 'text', placeholder: 'เช่น COSCO / Evergreen' },
    { key: 'status', label: 'สถานะ Shipment', type: 'text', placeholder: 'เช่น At Sea / Customs / Warehouse' },
    { key: 'vessel', label: 'ชื่อเรือ', type: 'text', placeholder: 'เช่น COSCO STAR' },
    { key: 'voyage_no', label: 'Voyage No.', type: 'text', placeholder: 'เช่น V.026E' },
    { key: 'container_no', label: 'Container No.', type: 'text', placeholder: 'เช่น TGHU1234567' },
    { key: 'origin_port', label: 'ต้นทาง (Origin Port)', type: 'text', placeholder: 'เช่น Shenzhen / Ningbo' },
    { key: 'destination_port', label: 'ปลายทาง (Destination Port)', type: 'text', placeholder: 'เช่น Bangkok Port / Laem Chabang' },
    { key: 'etd', label: 'วันเรือออกตามแผน (ETD)', type: 'date', placeholder: '' },
    { key: 'eta', label: 'วันเรือถึงตามแผน (ETA)', type: 'date', placeholder: '' },
    { key: 'actual_departure', label: 'วันเรือออกจริง (Actual Departure)', type: 'date', placeholder: '' },
    { key: 'actual_arrival', label: 'วันเรือถึงจริง (Actual Arrival)', type: 'date', placeholder: '' },
    { key: 'warehouse_date', label: 'วันที่สินค้าเข้าโกดัง', type: 'date', placeholder: '' }
  ];

  return (
    <div className="modalBg">
      <div className="modal">
        <h2>รายละเอียด Shipment / Vessel</h2>

        <div className="form">
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontWeight: 800, fontSize: 13 }}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={s[f.key] || ''}
                onChange={e => setS({ ...s, [f.key]: e.target.value })}
              />
            </div>
          ))}

          <div className="full">
            <label style={{ fontWeight: 800, fontSize: 13 }}>Timeline Shipment</label>
            <textarea
              placeholder="เช่น Supplier Confirm → Production → Booking → ETD → At Sea → ETA → Customs → Warehouse"
              value={s.timeline || ''}
              onChange={e => setS({ ...s, timeline: e.target.value })}
            />
          </div>

          <div className="full">
            <label style={{ fontWeight: 800, fontSize: 13 }}>Link อ้างอิง</label>
            <textarea
              placeholder="เช่น Google Drive, Booking, Tracking, PI, Invoice"
              value={s.links || ''}
              onChange={e => setS({ ...s, links: e.target.value })}
            />
          </div>

          <div className="full">
            <label style={{ fontWeight: 800, fontSize: 13 }}>หมายเหตุ</label>
            <textarea
              placeholder="เช่น Supplier แจ้งเลื่อนเรือ / รอเอกสาร / Container เปลี่ยน"
              value={s.remark || ''}
              onChange={e => setS({ ...s, remark: e.target.value })}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn light" onClick={onClose}>ยกเลิก</button>{' '}
          <button className="btn orange" onClick={onSave}>💾 บันทึก Shipment</button>
        </div>
      </div>
    </div>
  );
}

function ShipmentEventModal({ ev, setEv, ships, onClose, onSave }: any) {
  return (
    <div className="modalBg">
      <div className="modal">
        <h2>เพิ่ม / แก้ไข Shipment Event</h2>

        <div className="form">
          <div>
            <label style={{ fontWeight: 800, fontSize: 13 }}>เลือก Shipment</label>
            <select value={ev.shipment_id || ''} onChange={e => setEv({ ...ev, shipment_id: e.target.value })}>
              <option value="">เลือก Shipment</option>
              {ships.map((s: Shipment) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 800, fontSize: 13 }}>วันที่เกิดเหตุการณ์</label>
            <input type="date" value={ev.event_date || ''} onChange={e => setEv({ ...ev, event_date: e.target.value })} />
          </div>

          <div>
            <label style={{ fontWeight: 800, fontSize: 13 }}>ประเภท Event</label>
            <select value={ev.event_type || ''} onChange={e => setEv({ ...ev, event_type: e.target.value })}>
              {shipmentEventTypes.map(x => <option key={x}>{x}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 800, fontSize: 13 }}>หัวข้อ</label>
            <input placeholder="เช่น เลื่อน ETD เป็น 24 มิ.ย. / รับของเข้าโกดังแล้ว" value={ev.title || ''} onChange={e => setEv({ ...ev, title: e.target.value })} />
          </div>

          <div className="full">
            <label style={{ fontWeight: 800, fontSize: 13 }}>รายละเอียด</label>
            <textarea placeholder="รายละเอียด เช่น เลื่อนเพราะเรือเต็ม / รับของบางส่วน / รอเอกสาร" value={ev.detail || ''} onChange={e => setEv({ ...ev, detail: e.target.value })} />
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn light" onClick={onClose}>ยกเลิก</button>{' '}
          <button className="btn orange" onClick={onSave}>💾 บันทึก Event</button>
        </div>
      </div>
    </div>
  );
}

function LinkModal({ l, setL, onClose, onSave }: any) {
  return (
    <div className="modalBg">
      <div className="modal">
        <h2>เพิ่ม Files & Links</h2>

        <div className="form">
          <input placeholder="ชื่อ" value={l.title} onChange={e => setL({ ...l, title: e.target.value })} />
          <input placeholder="URL" value={l.url || ''} onChange={e => setL({ ...l, url: e.target.value })} />
          <input placeholder="ประเภท" value={l.ref_type || ''} onChange={e => setL({ ...l, ref_type: e.target.value })} />
          <input placeholder="อ้างอิงงาน/Shipment" value={l.ref_name || ''} onChange={e => setL({ ...l, ref_name: e.target.value })} />
          <textarea className="full" placeholder="หมายเหตุ" value={l.remark || ''} onChange={e => setL({ ...l, remark: e.target.value })} />
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn light" onClick={onClose}>ปิด</button>{' '}
          <button className="btn orange" onClick={onSave}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function Summary({ stats, min, setMin }: any) {
  return (
    <div className="widget">
      <div className="widgetHead">
        <b>📋 TOEY Workspace</b>
        <button onClick={() => setMin(!min)}>{min ? 'เปิด' : 'ย่อ'}</button>
      </div>

      {!min && (
        <div className="miniGrid">
          <div className="mini">
            <span>งานค้าง</span>
            <div>{stats.pending}</div>
          </div>
          <div className="mini">
            <span>วันนี้</span>
            <div>{stats.today}</div>
          </div>
          <div className="mini">
            <span>7 วัน</span>
            <div>{stats.week}</div>
          </div>
          <div className="mini">
            <span>Shipment</span>
            <div>{stats.ship}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({ tasks, ships, events }: any) {
  const [viewDate, setViewDate] = useState(new Date());

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  const cells: any[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    cells.push(toDateKey(new Date(y, m, d)));
  }

  function prevMonth() {
    setViewDate(new Date(y, m - 1, 1));
  }

  function nextMonth() {
    setViewDate(new Date(y, m + 1, 1));
  }

  function goToday() {
    setViewDate(new Date());
  }

  function dayClass(date: string | null) {
    if (!date) return 'day empty-day';

    const dateObj = new Date(`${date}T00:00:00`);
    const day = dateObj.getDay();
    const isHoliday = holidays.some(h => h[0] === date);
    const isToday = date === today();

    let cls = 'day';

    if (day === 0) cls += ' sunday-day';
    if (day === 6) cls += ' saturday-day';
    if (isHoliday) cls += ' holiday-day';
    if (isToday) cls += ' today-day';

    return cls;
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 10
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            Calendar -{' '}
            {viewDate.toLocaleDateString('th-TH', {
              month: 'long',
              year: 'numeric'
            })}
          </h3>
          <div className="sub">แสดงงาน, Shipment, Event, วันหยุด และเสาร์-อาทิตย์</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn light" onClick={prevMonth}>← เดือนก่อน</button>
          <button className="btn dark" onClick={goToday}>วันนี้</button>
          <button className="btn light" onClick={nextMonth}>เดือนถัดไป →</button>
        </div>
      </div>

      <div className="calendarLegend" style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="legendBox holidayLegend">วันหยุดนักขัตฤกษ์</span>
        <span className="legendBox saturdayLegend">วันเสาร์</span>
        <span className="legendBox sundayLegend">วันอาทิตย์</span>
        <span className="legendBox todayLegend">วันนี้</span>
      </div>

      <div className="calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => (
          <b key={x}>{x}</b>
        ))}

        {cells.map((date, i) => (
          <div className={dayClass(date)} key={i}>
            {date && (
              <>
                <small>{Number(date.slice(8, 10))}</small>

                {holidays
                  .filter(h => h[0] === date)
                  .map(h => (
                    <div className="holiday" key={h[1]}>
                      🎌 {h[1]}
                    </div>
                  ))}

                {tasks
                  .filter((t: Task) => t.due_date === date)
                  .map((t: Task) => (
                    <div className="item" key={t.id}>
                      ✅ {t.title}
                    </div>
                  ))}

                {ships
                  .filter((s: Shipment) => s.eta === date || s.etd === date || s.warehouse_date === date)
                  .map((s: Shipment) => (
                    <div className="item" key={s.id}>
                      🚢 {s.name}
                    </div>
                  ))}

                {events
                  .filter((ev: ShipmentEvent) => ev.event_date === date)
                  .map((ev: ShipmentEvent) => (
                    <div className="item" key={ev.id}>
                      📌 {ev.event_type}: {ev.title}
                    </div>
                  ))}
              </>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .holiday-day {
          background: #fff1f2 !important;
          border: 1px solid #fb7185 !important;
        }

        .saturday-day {
          background: #eff6ff;
        }

        .sunday-day {
          background: #fef2f2;
        }

        .today-day {
          box-shadow: inset 0 0 0 2px #f59e0b;
        }

        .holiday {
          background: #e11d48;
          color: white;
          padding: 3px 6px;
          border-radius: 8px;
          margin-top: 5px;
          font-size: 11px;
          font-weight: 700;
        }

        .item {
          background: #111827;
          color: white;
          padding: 3px 6px;
          border-radius: 8px;
          margin-top: 5px;
          font-size: 11px;
        }

        .legendBox {
          display: inline-flex;
          align-items: center;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .holidayLegend {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fb7185;
        }

        .saturdayLegend {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #93c5fd;
        }

        .sundayLegend {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }

        .todayLegend {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #f59e0b;
        }
      `}</style>
    </div>
  );
}
