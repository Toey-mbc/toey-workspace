'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';

type Profile = { id:string; email:string; display_name:string; role:string; approval_status:string; created_at:string; approved_at:string|null };

export default function Admin(){
  const router = useRouter();
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [msg,setMsg]=useState('');
  const [me,setMe]=useState<any>(null);
  useEffect(()=>{ load(); },[]);

  async function load(){
    if(!hasSupabaseConfig || !supabase){ router.push('/login'); return; }
    const {data:{session}} = await supabase.auth.getSession();
    if(!session){ router.push('/login'); return; }
    const {data:myProfile} = await supabase.from('profiles').select('*').eq('id',session.user.id).single();
    setMe(myProfile);
    if(!myProfile || myProfile.role !== 'admin' || myProfile.approval_status !== 'approved'){
      router.push('/'); return;
    }
    const {data,error} = await supabase.from('profiles').select('*').order('created_at',{ascending:false});
    if(error) setMsg(error.message); else setProfiles((data || []) as Profile[]);
  }
  async function approve(id:string){
    if(!supabase) return;
    const {error}=await supabase.rpc('approve_user',{target_user_id:id});
    if(error) setMsg(error.message); else { setMsg('อนุมัติเรียบร้อย'); load(); }
  }
  async function reject(id:string){
    if(!supabase) return;
    const {error}=await supabase.rpc('reject_user',{target_user_id:id});
    if(error) setMsg(error.message); else { setMsg('Reject เรียบร้อย'); load(); }
  }
  async function makeAdmin(p:Profile){
    if(!supabase) return;
    const {error}=await supabase.from('profiles').update({role:'admin', approval_status:'approved'}).eq('id',p.id);
    if(error) setMsg(error.message); else { setMsg('ตั้งเป็น Admin แล้ว'); load(); }
  }

  return <main className="app"><aside className="sidebar"><h2>TOEY Workspace</h2><p className="muted">Admin</p><button className="nav" onClick={()=>router.push('/')}>กลับหน้า Dashboard</button></aside><section className="content">
    <div className="topbar"><div><h1>Admin Approval</h1><p className="muted">อนุมัติสมาชิกที่สมัครใหม่ก่อนเข้าใช้งาน</p></div><button className="btn secondary" onClick={load}>Refresh</button></div>
    {msg && <div className="help">{msg}</div>}
    <div className="card">
      <table className="table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>
        {profiles.map(p=><tr key={p.id}><td>{p.email}</td><td>{p.display_name}</td><td>{p.role}</td><td><span className="pill">{p.approval_status}</span></td><td>{p.created_at?.slice(0,10)}</td><td className="row">
          {p.approval_status !== 'approved' && <button className="btn green" onClick={()=>approve(p.id)}>Approve</button>}
          {p.approval_status !== 'rejected' && <button className="btn warn" onClick={()=>reject(p.id)}>Reject</button>}
          {p.role !== 'admin' && <button className="btn secondary" onClick={()=>makeAdmin(p)}>Make Admin</button>}
        </td></tr>)}
      </tbody></table>
    </div>
  </section></main>
}
