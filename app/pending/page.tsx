'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';

export default function Pending(){
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [status,setStatus]=useState('pending');
  const [msg,setMsg]=useState('');

  useEffect(()=>{ check(); },[]);
  async function check(){
    if(!hasSupabaseConfig || !supabase){ router.push('/login'); return; }
    const {data:{session}} = await supabase.auth.getSession();
    if(!session){ router.push('/login'); return; }
    setEmail(session.user.email || '');
    const {data} = await supabase.from('profiles').select('approval_status,role').eq('id',session.user.id).single();
    if(data){
      setStatus(data.approval_status || 'pending');
      if(data.approval_status === 'approved') router.push('/');
    }
  }
  async function makeFirstAdmin(){
    if(!supabase) return;
    const {data,error} = await supabase.rpc('bootstrap_first_admin');
    if(error){ setMsg(error.message); return; }
    if(data){ setMsg('ตั้งบัญชีนี้เป็น Admin เรียบร้อย'); router.push('/'); }
    else setMsg('มี Admin อยู่แล้ว กรุณารอ Admin อนุมัติ');
  }
  async function logout(){ if(supabase) await supabase.auth.signOut(); router.push('/login'); }

  return <div className="loginwrap"><div className="login">
    <h1>รอ Admin อนุมัติ</h1>
    <p className="muted">บัญชี: {email}</p>
    <div className="help">สถานะปัจจุบัน: {status === 'pending' ? 'Pending / รออนุมัติ' : status}</div>
    <p className="muted">ถ้านี่เป็นบัญชีแรกของระบบ ให้กดปุ่มด้านล่างเพื่อสร้าง Admin คนแรก</p>
    <div className="row">
      <button className="btn" onClick={makeFirstAdmin}>ตั้งบัญชีนี้เป็น Admin คนแรก</button>
      <button className="btn secondary" onClick={check}>Refresh</button>
      <button className="btn secondary" onClick={logout}>Log Out</button>
    </div>
    {msg && <p className="muted">{msg}</p>}
  </div></div>
}
