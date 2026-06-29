'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';

export default function Login(){
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);

  async function signIn(){
    if(!hasSupabaseConfig || !supabase){ setMsg('ยังไม่ได้ตั้งค่า Supabase ใช้ Local Mode ได้ก่อน'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error) setMsg(error.message); else router.push('/');
  }

  async function signUp(){
    if(!hasSupabaseConfig || !supabase){ setMsg('ยังไม่ได้ตั้งค่า Supabase ใช้ Local Mode ได้ก่อน'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options:{ data:{ display_name: displayName || email } }
    });
    setBusy(false);
    if(error) setMsg(error.message);
    else setMsg('สมัครเรียบร้อย: รอ Admin อนุมัติก่อนเข้าใช้งาน ถ้า Supabase เปิด Confirm email ให้ยืนยันอีเมลก่อน');
  }

  return <div className="loginwrap"><div className="login">
    <h1>TOEY Workspace</h1>
    <p className="muted">เข้าสู่ระบบเพื่อใช้งานออนไลน์ หรือสมัครแล้วรอ Admin อนุมัติ</p>
    <div className="help">บัญชีแรกสามารถกดตั้งเป็น Admin ได้ที่หน้า Pending หลังสมัคร/เข้าสู่ระบบ</div>
    <div className="field" style={{marginTop:14}}><label>ชื่อผู้ใช้ / Display Name</label><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="เช่น Toey"/></div>
    <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"/></div>
    <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/></div>
    <div className="row" style={{marginTop:14}}>
      <button className="btn" onClick={signIn} disabled={busy}>Log In</button>
      <button className="btn secondary" onClick={signUp} disabled={busy}>Sign Up</button>
      <button className="btn secondary" onClick={()=>{localStorage.setItem('toey_local_mode','1');router.push('/')}}>ใช้ Local Mode</button>
    </div>
    {msg && <p className="muted">{msg}</p>}
  </div></div>
}
