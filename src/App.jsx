import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://sfsdoevklxgwcsdfrvlj.supabase.co";
const SUPABASE_KEY = "sb_publishable_9K_7B16EZpBdxkZJMHFhvw_PsrLTHt8";

async function db(table, method = "GET", body = null, extra = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${extra}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  if (method === "DELETE" || res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function uploadFile(bucket, file) {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const res  = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error("Error subiendo archivo");
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#F7F3EE", surface:"#FFFFFF", border:"#E2D9CE", sand:"#D9CFC4",
  camel:"#B8945A", camelDark:"#96763F", terra:"#C4622D", rust:"#8B3A1A",
  text:"#2C2016", muted:"#7A6A58", success:"#5A7A4A", successBg:"#EBF3E8",
  warn:"#B8945A", warnBg:"#FDF5E8", danger:"#C4622D", dangerBg:"#FBF0EB",
  tagBg:"#EDE5D8", initial:"#4A6A8A", initialBg:"#EAF0F6",
};

const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmt   = n  => "Bs " + Number(n||0).toLocaleString("es-BO",{minimumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

const SEED_CUENTAS = ["Cuenta Principal","Cuenta U01","Cuenta U02","Caja Chica"];
const CATEGORIAS   = ["Estructura","Hidráulica","Eléctrica","Acabados","Vegetación","Riego","Ferretería","Otro"];
const UNIDADES     = ["unid","m²","m³","ml","kg","bolsa","litro","rollo","par","caja","galón"];
const ESTADOS_PROY = ["Inicial","En ejecución","Pausado","Finalizado"];
const TIPOS_PROY   = ["Jardín","Piscina/Lago","Jardín Vertical","Paisajismo General","Otro"];

// ── UI PRIMITIVOS ─────────────────────────────────────────────────────────────
function Badge({ label }) {
  const map = {
    "En ejecución":  { bg:C.successBg, text:C.success },
    "Inicial":       { bg:C.initialBg, text:C.initial },
    "Finalizado":    { bg:C.tagBg,     text:C.muted   },
    "Pausado":       { bg:C.warnBg,    text:C.warn    },
    "Pendiente":     { bg:C.warnBg,    text:C.warn    },
    "Aprobada":      { bg:C.successBg, text:C.success },
    "Rechazada":     { bg:C.dangerBg,  text:C.danger  },
    "Vencida":       { bg:C.tagBg,     text:C.muted   },
    "Pagado":        { bg:C.successBg, text:C.success },
    "Parcial":       { bg:C.warnBg,    text:C.warn    },
    "Pendiente pago":{ bg:C.dangerBg,  text:C.danger  },
  };
  const s = map[label] || { bg:C.tagBg, text:C.muted };
  return <span style={{ background:s.bg, color:s.text, fontSize:11, fontWeight:600,
    letterSpacing:".4px", padding:"2px 9px", borderRadius:20,
    textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,32,22,.45)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.surface, borderRadius:12, width:"100%",
        maxWidth: wide ? 680 : 520, maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 8px 40px rgba(44,32,22,.18)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 22px 14px", borderBottom:`1px solid ${C.border}`,
          position:"sticky", top:0, background:C.surface, zIndex:1 }}>
          <span style={{ fontWeight:700, fontSize:16, color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            fontSize:20, color:C.muted, lineHeight:1, padding:"0 4px" }}>×</button>
        </div>
        <div style={{ padding:"20px 22px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, required, col }) {
  return (
    <div style={{ marginBottom:14, gridColumn: col||undefined }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted,
        marginBottom:5, letterSpacing:".3px" }}>
        {label}{required && <span style={{ color:C.terra }}> *</span>}
      </label>
      {children}
    </div>
  );
}
const iS = { width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`,
  borderRadius:7, fontSize:14, color:C.text, background:C.bg,
  boxSizing:"border-box", outline:"none", fontFamily:"inherit" };
function Input(p)  { return <input  style={iS} {...p} />; }
function Select({ children, ...p }) { return <select style={{ ...iS, cursor:"pointer" }} {...p}>{children}</select>; }
function Textarea(p) { return <textarea style={{ ...iS, minHeight:72, resize:"vertical" }} {...p} />; }

function Btn({ children, onClick, variant="primary", small, disabled, style:ext }) {
  const base = { border:"none", borderRadius:7, cursor: disabled?"not-allowed":"pointer",
    fontFamily:"inherit", fontWeight:600, letterSpacing:".2px",
    fontSize: small?12:14, padding: small?"6px 12px":"10px 18px",
    transition:"opacity .15s", opacity: disabled?.5:1, ...ext };
  const v = { primary:{ background:C.camel, color:"#fff" },
    danger: { background:C.terra, color:"#fff" },
    ghost:  { background:C.tagBg, color:C.text },
    outline:{ background:"transparent", color:C.camel, border:`1.5px solid ${C.camel}` } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant] }}>{children}</button>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
      padding:"16px 20px", borderLeft:`3px solid ${accent||C.camel}` }}>
      <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:".4px",
        textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Empty({ icon, msg }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 20px", color:C.muted }}>
      <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:14 }}>{msg}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ textAlign:"center", padding:"40px 20px", color:C.muted, fontSize:14 }}>
    Cargando...
  </div>;
}

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map(r => keys.map(k =>
    `"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))];
  const blob = new Blob([rows.join("\n")], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ proyectos, materiales, cotizaciones, pagos }) {
  const totalCompras  = materiales.reduce((s,m)  => s + m.precio_unitario*m.cantidad, 0);
  const totalPagos    = pagos.reduce((s,p)        => s + (p.monto_pagado||0), 0);
  const proyActivos   = proyectos.filter(p => p.estado==="En ejecución").length;
  const cotPend       = cotizaciones.filter(c => c.estado==="Pendiente").length;
  const pagosPend     = pagos.filter(p => p.estado_pago!=="Pagado").length;

  const gastoProy = proyectos.map(p => ({
    nombre: p.nombre,
    total: materiales.filter(m=>m.proyecto_id===p.id).reduce((s,m)=>s+m.precio_unitario*m.cantidad,0)
         + pagos.filter(pg=>pg.proyecto_id===p.id).reduce((s,pg)=>s+(pg.monto_pagado||0),0),
  })).sort((a,b)=>b.total-a.total);

  const ultimas = [...materiales].sort((a,b)=>b.fecha?.localeCompare(a.fecha)).slice(0,5);
  const maxTotal = Math.max(...gastoProy.map(p=>p.total), 1);

  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontSize:20, color:C.text }}>Resumen general</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:28 }}>
        <StatCard label="Proyectos activos"       value={proyActivos}       accent={C.success} />
        <StatCard label="Gasto en materiales"     value={fmt(totalCompras)} accent={C.camel}   />
        <StatCard label="Pagos a proveedores"     value={fmt(totalPagos)}   accent={C.terra}   />
        <StatCard label="Cotizaciones pendientes" value={cotPend}           accent={C.warn}    />
        <StatCard label="Pagos pendientes"        value={pagosPend}         accent={C.danger}  />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:C.text }}>Gasto por proyecto</div>
          {gastoProy.length===0 ? <Empty icon="📊" msg="Sin datos" /> : gastoProy.map(p=>(
            <div key={p.nombre} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                <span style={{ color:C.text, fontWeight:500 }}>{p.nombre}</span>
                <span style={{ color:C.camel, fontWeight:700 }}>{fmt(p.total)}</span>
              </div>
              <div style={{ height:5, background:C.tagBg, borderRadius:4 }}>
                <div style={{ height:"100%", width:`${(p.total/maxTotal)*100}%`,
                  background:C.camel, borderRadius:4, transition:"width .4s" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14, color:C.text }}>Últimas compras</div>
          {ultimas.length===0 ? <Empty icon="🛒" msg="Ninguna compra registrada" /> : ultimas.map(m=>(
            <div key={m.id} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{m.material}</div>
                <div style={{ fontSize:11, color:C.muted }}>{m.proyecto_nombre} · {m.comprado_por}</div>
              </div>
              <span style={{ fontSize:13, color:C.camel, fontWeight:700, whiteSpace:"nowrap", marginLeft:8 }}>
                {fmt(m.precio_unitario*m.cantidad)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROYECTOS
// ══════════════════════════════════════════════════════════════════════════════
function Proyectos({ proyectos, reload, materiales, pagos }) {
  const [modal,  setModal]  = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const empty = { nombre:"", tipo:"Jardín", estado:"Inicial", cliente:"" };
  const [form, setForm] = useState(empty);

  const abrir = (p) => { setForm(p||empty); setEditId(p?.id||null); setModal(true); };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await db("proyectos", "PATCH", { nombre:form.nombre, tipo:form.tipo, estado:form.estado, cliente:form.cliente }, `?id=eq.${editId}`);
      } else {
        await db("proyectos", "POST", { ...form, id:uid() });
      }
      await reload();
      setModal(false);
    } catch(e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:20, color:C.text }}>Proyectos</h2>
        <Btn onClick={()=>abrir(null)}>+ Nuevo proyecto</Btn>
      </div>
      {proyectos.length===0 ? <Empty icon="🌿" msg="Agrega tu primer proyecto" /> : (
        <div style={{ display:"grid", gap:10 }}>
          {proyectos.map(p=>{
            const gastoMat  = materiales.filter(m=>m.proyecto_id===p.id).reduce((s,m)=>s+m.precio_unitario*m.cantidad,0);
            const gastoPago = pagos.filter(pg=>pg.proyecto_id===p.id).reduce((s,pg)=>s+(pg.monto_pagado||0),0);
            return (
              <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
                padding:"16px 20px", display:"flex", alignItems:"center",
                justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{p.nombre}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{p.tipo} · {p.cliente||"Sin cliente"}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, color:C.camel, fontWeight:700 }}>{fmt(gastoMat+gastoPago)}</div>
                    <div style={{ fontSize:11, color:C.muted }}>Mat: {fmt(gastoMat)} · Prov: {fmt(gastoPago)}</div>
                  </div>
                  <Badge label={p.estado} />
                  <Btn small variant="ghost" onClick={()=>abrir(p)}>Editar</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <Modal title={editId?"Editar proyecto":"Nuevo proyecto"} onClose={()=>setModal(false)}>
          <Field label="Nombre del proyecto" required>
            <Input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. Piscina Los Álamos" />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <Field label="Tipo">
              <Select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                {TIPOS_PROY.map(t=><option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}>
                {ESTADOS_PROY.map(e=><option key={e}>{e}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Cliente">
            <Input value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} placeholder="Nombre del cliente" />
          </Field>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={saving||!form.nombre}>{saving?"Guardando...":"Guardar proyecto"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPRAS
// ══════════════════════════════════════════════════════════════════════════════
function Compras({ materiales, reload, proyectos, usuarios }) {
  const emptyForm = {
    proyecto_id:"", proyecto_nombre:"", fecha:today(), material:"",
    categoria:"Ferretería", cantidad:"", unidad:"unid", precio_unitario:"",
    proveedor:"", comprado_por:usuarios[0]?.codigo||"",
    cuenta:SEED_CUENTAS[0], etapa:"", notas:"",
  };
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState({ proyecto:"", usuario:"", categoria:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const guardar = async () => {
    if (!form.material||!form.cantidad||!form.precio_unitario||!form.proyecto_id) return;
    setSaving(true);
    try {
      const proy = proyectos.find(p=>p.id===form.proyecto_id);
      await db("materiales","POST",{
        ...form, id:uid(),
        proyecto_nombre: proy?.nombre||"",
        cantidad: +form.cantidad,
        precio_unitario: +form.precio_unitario,
      });
      await reload();
      setModal(false); setForm(emptyForm);
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  const filtrados = materiales.filter(m=>
    (!filtro.proyecto  || m.proyecto_id===filtro.proyecto) &&
    (!filtro.usuario   || m.comprado_por===filtro.usuario) &&
    (!filtro.categoria || m.categoria===filtro.categoria)
  );
  const totalFiltrado = filtrados.reduce((s,m)=>s+m.precio_unitario*m.cantidad,0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:20, color:C.text }}>Compras de material</h2>
        <Btn onClick={()=>{ setForm({...emptyForm, proyecto_id:proyectos[0]?.id||""}); setModal(true); }}>+ Registrar compra</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <Select value={filtro.proyecto} onChange={e=>setFiltro({...filtro,proyecto:e.target.value})} style={{ ...iS, width:"auto", fontSize:13 }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
        <Select value={filtro.usuario} onChange={e=>setFiltro({...filtro,usuario:e.target.value})} style={{ ...iS, width:"auto", fontSize:13 }}>
          <option value="">Todos los usuarios</option>
          {usuarios.map(u=><option key={u.codigo} value={u.codigo}>{u.codigo} – {u.nombre}</option>)}
        </Select>
        <Select value={filtro.categoria} onChange={e=>setFiltro({...filtro,categoria:e.target.value})} style={{ ...iS, width:"auto", fontSize:13 }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
        </Select>
        {(filtro.proyecto||filtro.usuario||filtro.categoria) &&
          <Btn variant="ghost" small onClick={()=>setFiltro({proyecto:"",usuario:"",categoria:""})}>Limpiar</Btn>}
      </div>
      <div style={{ marginBottom:12, fontSize:13, color:C.muted }}>
        {filtrados.length} registros · Total: <strong style={{ color:C.camel }}>{fmt(totalFiltrado)}</strong>
      </div>
      {filtrados.length===0 ? <Empty icon="🛒" msg="Sin compras registradas" /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.tagBg }}>
                {["Fecha","Proyecto","Material","Cat.","Cant.","P.Unit.","Total","Usuario","Cuenta"].map(h=>(
                  <th key={h} style={{ padding:"9px 10px", textAlign:"left", fontWeight:700,
                    color:C.muted, fontSize:11, letterSpacing:".3px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m,i)=>(
                <tr key={m.id} style={{ background: i%2===0?C.surface:C.bg, borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 10px", color:C.muted, whiteSpace:"nowrap" }}>{m.fecha}</td>
                  <td style={{ padding:"9px 10px", fontWeight:500, color:C.text }}>{m.proyecto_nombre}</td>
                  <td style={{ padding:"9px 10px", color:C.text }}>{m.material}</td>
                  <td style={{ padding:"9px 10px" }}><Badge label={m.categoria}/></td>
                  <td style={{ padding:"9px 10px", whiteSpace:"nowrap" }}>{m.cantidad} {m.unidad}</td>
                  <td style={{ padding:"9px 10px" }}>{fmt(m.precio_unitario)}</td>
                  <td style={{ padding:"9px 10px", fontWeight:700, color:C.camel, whiteSpace:"nowrap" }}>{fmt(m.precio_unitario*m.cantidad)}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{ background:C.tagBg, color:C.muted, fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:12 }}>{m.comprado_por}</span>
                  </td>
                  <td style={{ padding:"9px 10px", color:C.muted, fontSize:12 }}>{m.cuenta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title="Registrar compra" onClose={()=>setModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <Field label="Proyecto" required>
              <Select value={form.proyecto_id} onChange={e=>set("proyecto_id",e.target.value)}>
                <option value="">Seleccionar...</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Fecha" required><Input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Field>
            <Field label="Material" required col="1 / span 2">
              <Input value={form.material} onChange={e=>set("material",e.target.value)} placeholder="Ej. Cemento Portland 50kg"/>
            </Field>
            <Field label="Categoría">
              <Select value={form.categoria} onChange={e=>set("categoria",e.target.value)}>
                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Etapa de obra">
              <Input value={form.etapa} onChange={e=>set("etapa",e.target.value)} placeholder="Ej. Estructura"/>
            </Field>
            <Field label="Cantidad" required><Input type="number" value={form.cantidad} onChange={e=>set("cantidad",e.target.value)} placeholder="0"/></Field>
            <Field label="Unidad">
              <Select value={form.unidad} onChange={e=>set("unidad",e.target.value)}>
                {UNIDADES.map(u=><option key={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="Precio unitario (Bs)" required><Input type="number" value={form.precio_unitario} onChange={e=>set("precio_unitario",e.target.value)} placeholder="0.00"/></Field>
            <Field label="Proveedor"><Input value={form.proveedor} onChange={e=>set("proveedor",e.target.value)} placeholder="Nombre o tienda"/></Field>
            <Field label="Comprado por">
              <Select value={form.comprado_por} onChange={e=>set("comprado_por",e.target.value)}>
                {usuarios.map(u=><option key={u.codigo} value={u.codigo}>{u.codigo} – {u.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Cuenta usada">
              <Select value={form.cuenta} onChange={e=>set("cuenta",e.target.value)}>
                {SEED_CUENTAS.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notas"><Textarea value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder="Observaciones"/></Field>
          {form.cantidad>0 && form.precio_unitario>0 && (
            <div style={{ background:C.warnBg, border:`1px solid ${C.sand}`, borderRadius:7,
              padding:"10px 14px", marginBottom:14, fontSize:13 }}>
              Total: <strong style={{ color:C.camel }}>{fmt(+form.cantidad * +form.precio_unitario)}</strong>
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={saving||!form.material||!form.cantidad||!form.precio_unitario||!form.proyecto_id}>
              {saving?"Guardando...":"Guardar compra"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGOS A PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════════
function Pagos({ pagos, reload, proyectos, usuarios, cotizaciones }) {
  const emptyForm = {
    proyecto_id:"", proveedor:"", concepto:"",
    monto_total:"", monto_pagado:"", fecha:today(),
    pagado_por:usuarios[0]?.codigo||"", cuenta:SEED_CUENTAS[0],
    cotizacion_ref:"", notas:"",
    comprobante_nombre:"", comprobante_preview:"", _file:null,
  };
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState({ proyecto:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const estadoPago = (mt,mp) => {
    if (!mp||+mp===0) return "Pendiente pago";
    if (+mp >= +mt)   return "Pagado";
    return "Parcial";
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    set("_file", f);
    set("comprobante_nombre", f.name);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = ev => set("comprobante_preview", ev.target.result);
      r.readAsDataURL(f);
    }
  };

  const guardar = async () => {
    if (!form.proveedor||!form.monto_total||!form.proyecto_id) return;
    setSaving(true);
    try {
      let comprobante_url = "";
      if (form._file) {
        comprobante_url = await uploadFile("comprobantes", form._file);
      }
      const proy = proyectos.find(p=>p.id===form.proyecto_id);
      const estado_pago = estadoPago(form.monto_total, form.monto_pagado);
      await db("pagos","POST",{
        id:uid(), proyecto_id:form.proyecto_id,
        proyecto_nombre: proy?.nombre||"",
        proveedor:form.proveedor, concepto:form.concepto,
        monto_total:+form.monto_total, monto_pagado:+form.monto_pagado||0,
        estado_pago, fecha:form.fecha,
        pagado_por:form.pagado_por, cuenta:form.cuenta,
        cotizacion_ref:form.cotizacion_ref, notas:form.notas,
        comprobante_url, comprobante_nombre:form.comprobante_nombre,
      });
      await reload();
      setModal(false); setForm(emptyForm);
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  const filtrados = pagos.filter(p=>!filtro.proyecto||p.proyecto_id===filtro.proyecto);
  const totalPagado    = filtrados.reduce((s,p)=>s+(p.monto_pagado||0),0);
  const totalPendiente = filtrados.reduce((s,p)=>s+((p.monto_total||0)-(p.monto_pagado||0)),0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:20, color:C.text }}>Pagos a proveedores</h2>
        <Btn onClick={()=>{ setForm({...emptyForm, proyecto_id:proyectos[0]?.id||""}); setModal(true); }}>+ Registrar pago</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <Select value={filtro.proyecto} onChange={e=>setFiltro({proyecto:e.target.value})} style={{ ...iS, width:"auto", fontSize:13 }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <StatCard label="Total pagado"    value={fmt(totalPagado)}    accent={C.success} />
        <StatCard label="Saldo pendiente" value={fmt(totalPendiente)} accent={C.danger}  />
      </div>
      {filtrados.length===0 ? <Empty icon="💳" msg="Sin pagos registrados" /> : (
        <div style={{ display:"grid", gap:10 }}>
          {filtrados.map(p=>{
            const saldo = (p.monto_total||0)-(p.monto_pagado||0);
            return (
              <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{p.proveedor}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                      {p.proyecto_nombre} · {p.concepto||"Sin concepto"} · {p.fecha}
                    </div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                      <span style={{ background:C.tagBg, padding:"1px 6px", borderRadius:10, fontWeight:600 }}>{p.pagado_por}</span>
                      {" · "}{p.cuenta}
                      {p.cotizacion_ref && <span> · Ref: {p.cotizacion_ref}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{fmt(p.monto_total)}</div>
                    <div style={{ fontSize:12, color:C.success }}>Pagado: {fmt(p.monto_pagado)}</div>
                    {saldo>0 && <div style={{ fontSize:12, color:C.danger }}>Saldo: {fmt(saldo)}</div>}
                  </div>
                </div>
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <Badge label={p.estado_pago}/>
                  {p.comprobante_url && (
                    p.comprobante_url.match(/\.(jpg|jpeg|png|webp)$/i)
                      ? <img src={p.comprobante_url} alt="comprobante"
                          style={{ height:36, width:36, objectFit:"cover", borderRadius:5,
                            border:`1px solid ${C.border}`, cursor:"pointer" }}
                          onClick={()=>window.open(p.comprobante_url,"_blank")}/>
                      : <a href={p.comprobante_url} target="_blank" rel="noreferrer"
                          style={{ fontSize:12, color:C.camel, fontWeight:600 }}>
                          📎 {p.comprobante_nombre||"Ver comprobante"}
                        </a>
                  )}
                  {p.notas && <span style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>{p.notas}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <Modal title="Registrar pago a proveedor" onClose={()=>setModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <Field label="Proyecto" required>
              <Select value={form.proyecto_id} onChange={e=>set("proyecto_id",e.target.value)}>
                <option value="">Seleccionar...</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Fecha" required><Input type="date" value={form.fecha} onChange={e=>set("fecha",e.target.value)}/></Field>
            <Field label="Proveedor" required col="1 / span 2">
              <Input value={form.proveedor} onChange={e=>set("proveedor",e.target.value)} placeholder="Nombre del proveedor"/>
            </Field>
            <Field label="Concepto" col="1 / span 2">
              <Input value={form.concepto} onChange={e=>set("concepto",e.target.value)} placeholder="Ej. Mano de obra estructura"/>
            </Field>
            <Field label="Monto total (Bs)" required>
              <Input type="number" value={form.monto_total} onChange={e=>set("monto_total",e.target.value)} placeholder="0.00"/>
            </Field>
            <Field label="Monto pagado (Bs)">
              <Input type="number" value={form.monto_pagado} onChange={e=>set("monto_pagado",e.target.value)} placeholder="0.00"/>
            </Field>
            <Field label="Pagado por">
              <Select value={form.pagado_por} onChange={e=>set("pagado_por",e.target.value)}>
                {usuarios.map(u=><option key={u.codigo} value={u.codigo}>{u.codigo} – {u.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Cuenta usada">
              <Select value={form.cuenta} onChange={e=>set("cuenta",e.target.value)}>
                {SEED_CUENTAS.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Referencia cotización" col="1 / span 2">
              <Select value={form.cotizacion_ref} onChange={e=>set("cotizacion_ref",e.target.value)}>
                <option value="">Sin referencia</option>
                {cotizaciones.filter(c=>c.proyecto_id===form.proyecto_id).map(c=>(
                  <option key={c.id} value={c.numero}>{c.numero} – {c.proveedor} ({fmt(c.monto)})</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Comprobante de pago (foto o PDF)">
            <div style={{ border:`1.5px dashed ${C.sand}`, borderRadius:7, padding:"14px 16px",
              background:C.bg, textAlign:"center" }}>
              <input type="file" accept="image/*,.pdf" onChange={handleFile}
                style={{ display:"none" }} id="file-comp"/>
              <label htmlFor="file-comp" style={{ cursor:"pointer", fontSize:13, color:C.camel, fontWeight:600 }}>
                {form.comprobante_nombre ? `📎 ${form.comprobante_nombre}` : "📎 Subir comprobante"}
              </label>
              {form.comprobante_preview && (
                <img src={form.comprobante_preview} alt="preview"
                  style={{ display:"block", margin:"10px auto 0", maxHeight:80, borderRadius:6 }}/>
              )}
            </div>
          </Field>
          <Field label="Notas"><Textarea value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder="Observaciones"/></Field>
          {form.monto_total>0 && (
            <div style={{ background:C.warnBg, border:`1px solid ${C.sand}`, borderRadius:7,
              padding:"10px 14px", marginBottom:14, fontSize:13 }}>
              Estado: <strong style={{ color:C.camel }}>{estadoPago(form.monto_total,form.monto_pagado)}</strong>
              {+form.monto_total-(+form.monto_pagado||0)>0 &&
                <> · Saldo: <strong style={{ color:C.danger }}>{fmt(+form.monto_total-(+form.monto_pagado||0))}</strong></>}
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={saving||!form.proveedor||!form.monto_total||!form.proyecto_id}>
              {saving?"Guardando...":"Guardar pago"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COTIZACIONES
// ══════════════════════════════════════════════════════════════════════════════
function Cotizaciones({ cotizaciones, reload, proyectos }) {
  const emptyForm = {
    proyecto_id:"", numero:"", proveedor:"", descripcion:"",
    monto:"", fecha_emision:today(), fecha_vencimiento:"",
    estado:"Pendiente", archivo_nombre:"", notas:"", _file:null,
  };
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const nextNum = () => `COT-${new Date().getFullYear()}-${String(cotizaciones.length+1).padStart(3,"0")}`;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { set("_file",f); set("archivo_nombre",f.name); }
  };

  const guardar = async () => {
    if (!form.proveedor||!form.monto||!form.proyecto_id) return;
    setSaving(true);
    try {
      let archivo_url = "";
      if (form._file) archivo_url = await uploadFile("cotizaciones", form._file);
      const proy = proyectos.find(p=>p.id===form.proyecto_id);
      await db("cotizaciones","POST",{
        id:uid(), proyecto_id:form.proyecto_id,
        proyecto_nombre:proy?.nombre||"",
        numero:form.numero||nextNum(),
        proveedor:form.proveedor, descripcion:form.descripcion,
        monto:+form.monto, fecha_emision:form.fecha_emision,
        fecha_vencimiento:form.fecha_vencimiento||null,
        estado:form.estado, archivo_url,
        archivo_nombre:form.archivo_nombre, notas:form.notas,
      });
      await reload();
      setModal(false); setForm(emptyForm);
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  const cambiarEstado = async (id, estado) => {
    await db("cotizaciones","PATCH",{estado},`?id=eq.${id}`);
    await reload();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, color:C.text }}>Cotizaciones</h2>
          <p style={{ margin:0, fontSize:12, color:C.muted }}>Registro de referencia — el detalle vive en la planilla adjunta.</p>
        </div>
        <Btn onClick={()=>{ setForm({...emptyForm, numero:nextNum()}); setModal(true); }}>+ Nueva cotización</Btn>
      </div>
      {cotizaciones.length===0 ? <Empty icon="📋" msg="Sin cotizaciones registradas" /> : (
        <div style={{ display:"grid", gap:10 }}>
          {cotizaciones.map(c=>(
            <div key={c.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:".4px", marginBottom:3 }}>{c.numero}</div>
                  <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{c.proveedor}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                    {c.proyecto_nombre} · Emitida: {c.fecha_emision}
                    {c.fecha_vencimiento && ` · Vence: ${c.fecha_vencimiento}`}
                  </div>
                  {c.descripcion && <div style={{ fontSize:13, color:C.text, marginTop:4 }}>{c.descripcion}</div>}
                  {c.archivo_url && (
                    <a href={c.archivo_url} target="_blank" rel="noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6,
                        background:C.tagBg, padding:"3px 10px", borderRadius:20,
                        fontSize:12, color:C.camel, textDecoration:"none" }}>
                      📎 {c.archivo_nombre||"Ver archivo"}
                    </a>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                  <span style={{ fontSize:18, fontWeight:800, color:C.camel }}>{fmt(c.monto)}</span>
                  <Badge label={c.estado}/>
                </div>
              </div>
              {c.estado==="Pendiente" && (
                <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                  <Btn small variant="ghost"   onClick={()=>cambiarEstado(c.id,"Aprobada")}>✓ Aprobar</Btn>
                  <Btn small variant="outline" onClick={()=>cambiarEstado(c.id,"Rechazada")}>✗ Rechazar</Btn>
                  <Btn small variant="ghost"   onClick={()=>cambiarEstado(c.id,"Vencida")}>Vencer</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Nueva cotización" onClose={()=>setModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
            <Field label="Proyecto" required>
              <Select value={form.proyecto_id} onChange={e=>set("proyecto_id",e.target.value)}>
                <option value="">Seleccionar...</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>
            <Field label="N° Cotización"><Input value={form.numero} onChange={e=>set("numero",e.target.value)} placeholder={nextNum()}/></Field>
            <Field label="Proveedor" required>
              <Input value={form.proveedor} onChange={e=>set("proveedor",e.target.value)} placeholder="Nombre del proveedor"/>
            </Field>
            <Field label="Monto total (Bs)" required>
              <Input type="number" value={form.monto} onChange={e=>set("monto",e.target.value)} placeholder="0.00"/>
            </Field>
            <Field label="Fecha emisión"><Input type="date" value={form.fecha_emision} onChange={e=>set("fecha_emision",e.target.value)}/></Field>
            <Field label="Vencimiento"><Input type="date" value={form.fecha_vencimiento} onChange={e=>set("fecha_vencimiento",e.target.value)}/></Field>
          </div>
          <Field label="Descripción breve">
            <Input value={form.descripcion} onChange={e=>set("descripcion",e.target.value)} placeholder="Ej. Materiales hidráulicos — ver planilla adjunta"/>
          </Field>
          <Field label="Adjuntar PDF de cotización">
            <div style={{ border:`1.5px dashed ${C.sand}`, borderRadius:7, padding:"14px 16px",
              background:C.bg, textAlign:"center" }}>
              <input type="file" accept=".pdf,image/*" onChange={handleFile} style={{ display:"none" }} id="file-cot"/>
              <label htmlFor="file-cot" style={{ cursor:"pointer", fontSize:13, color:C.camel, fontWeight:600 }}>
                {form.archivo_nombre ? `📎 ${form.archivo_nombre}` : "📎 Seleccionar archivo (PDF o imagen)"}
              </label>
            </div>
          </Field>
          <Field label="Notas"><Textarea value={form.notas} onChange={e=>set("notas",e.target.value)} placeholder="Observaciones"/></Field>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={saving||!form.proveedor||!form.monto||!form.proyecto_id}>
              {saving?"Guardando...":"Guardar cotización"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════════════════════════
function Historial({ materiales }) {
  const [busca, setBusca] = useState("");
  const grupos = {};
  materiales.forEach(m=>{
    const key = m.material.toLowerCase().trim();
    if (!grupos[key]) grupos[key]={ nombre:m.material, registros:[] };
    grupos[key].registros.push(m);
  });
  const lista = Object.values(grupos)
    .filter(g=>!busca||g.nombre.toLowerCase().includes(busca.toLowerCase()))
    .sort((a,b)=>a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ margin:"0 0 6px", fontSize:20, color:C.text }}>Historial de materiales</h2>
        <p style={{ margin:"0 0 14px", fontSize:13, color:C.muted }}>Precios y cantidades históricas para calibrar futuras cotizaciones.</p>
        <Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar material..." style={{ ...iS, maxWidth:300 }}/>
      </div>
      {lista.length===0 ? <Empty icon="📈" msg="Registra compras para ver el historial"/> : (
        <div style={{ display:"grid", gap:12 }}>
          {lista.map(g=>{
            const precios  = g.registros.map(r=>r.precio_unitario);
            const pMin     = Math.min(...precios), pMax=Math.max(...precios);
            const pProm    = precios.reduce((a,b)=>a+b,0)/precios.length;
            const cantTotal= g.registros.reduce((s,r)=>s+r.cantidad,0);
            const variacion= pMax>0?((pMax-pMin)/pMin*100).toFixed(0):0;
            return (
              <div key={g.nombre} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{g.nombre}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{g.registros.length} compras · {cantTotal} {g.registros[0]?.unidad} total</div>
                  </div>
                  {+variacion>20 && (
                    <span style={{ background:C.dangerBg, color:C.danger, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>
                      ↑ {variacion}% variación de precio
                    </span>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                  {[["Precio mín.",fmt(pMin)],["Precio prom.",fmt(pProm)],["Precio máx.",fmt(pMax)]].map(([l,v])=>(
                    <div key={l} style={{ background:C.bg, borderRadius:7, padding:"8px 12px" }}>
                      <div style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:".3px" }}>{l}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.camel, marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {g.registros.slice(-4).map(r=>(
                  <div key={r.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12,
                    color:C.muted, padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span>{r.fecha} · {r.proyecto_nombre}</span>
                    <span>{r.cantidad} {r.unidad} × {fmt(r.precio_unitario)} = <strong style={{ color:C.text }}>{fmt(r.cantidad*r.precio_unitario)}</strong></span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════════════════════════
function Usuarios({ usuarios, reload }) {
  const nextCodigo = () => {
    const nums = usuarios.map(u=>parseInt(u.codigo.replace("U",""))||0);
    return `U${String(Math.max(0,...nums)+1).padStart(2,"0")}`;
  };
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({ nombre:"", rol:"" });
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      await db("usuarios","POST",{ codigo:nextCodigo(), nombre:form.nombre, rol:form.rol });
      await reload();
      setModal(false); setForm({ nombre:"", rol:"" });
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  const actualizar = async (codigo, campo, valor) => {
    await db("usuarios","PATCH",{ [campo]:valor },`?codigo=eq.${codigo}`);
    await reload();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, color:C.text }}>Usuarios</h2>
          <p style={{ margin:0, fontSize:12, color:C.muted }}>Códigos fijos — si cambia el personal, actualiza el nombre sin perder el historial.</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Agregar usuario</Btn>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {usuarios.map(u=>(
          <div key={u.codigo} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div style={{ background:C.camel, color:"#fff", fontWeight:800, fontSize:13,
              borderRadius:8, padding:"6px 12px", letterSpacing:".5px", whiteSpace:"nowrap" }}>{u.codigo}</div>
            <div style={{ flex:1, minWidth:160 }}>
              <Input value={u.nombre}
                onBlur={e=>actualizar(u.codigo,"nombre",e.target.value)}
                onChange={e=>{ /* local only */ }}
                defaultValue={u.nombre}
                style={{ ...iS, fontWeight:600 }} key={u.codigo+"n"}/>
            </div>
            <div style={{ width:160 }}>
              <Input defaultValue={u.rol||""}
                onBlur={e=>actualizar(u.codigo,"rol",e.target.value)}
                placeholder="Rol (ej. Ejecución)"
                style={{ ...iS, fontSize:13 }} key={u.codigo+"r"}/>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Agregar usuario" onClose={()=>setModal(false)}>
          <div style={{ background:C.tagBg, borderRadius:7, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.muted }}>
            Código asignado automáticamente: <strong style={{ color:C.camel }}>{nextCodigo()}</strong>
          </div>
          <Field label="Nombre completo" required>
            <Input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej. María González"/>
          </Field>
          <Field label="Rol">
            <Input value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})} placeholder="Ej. Ejecución, Compras, Dirección"/>
          </Field>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={saving||!form.nombre}>{saving?"Guardando...":"Agregar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [proyectos,    setProyectos]    = useState([]);
  const [materiales,   setMateriales]   = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [pagos,        setPagos]        = useState([]);
  const [usuarios,     setUsuarios]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("dashboard");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, ma, co, pa, us] = await Promise.all([
        db("proyectos",    "GET", null, "?order=created_at.asc"),
        db("materiales",   "GET", null, "?order=fecha.desc"),
        db("cotizaciones", "GET", null, "?order=fecha_emision.desc"),
        db("pagos",        "GET", null, "?order=fecha.desc"),
        db("usuarios",     "GET", null, "?order=codigo.asc"),
      ]);
      setProyectos(pr||[]); setMateriales(ma||[]);
      setCotizaciones(co||[]); setPagos(pa||[]); setUsuarios(us||[]);
    } catch(e) { alert("Error cargando datos: "+e.message); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  const tabs = [
    { id:"dashboard",    label:"Resumen",      icon:"◈" },
    { id:"proyectos",    label:"Proyectos",    icon:"🌿" },
    { id:"compras",      label:"Compras",      icon:"🛒" },
    { id:"pagos",        label:"Proveedores",  icon:"💳" },
    { id:"cotizaciones", label:"Cotizaciones", icon:"📋" },
    { id:"historial",    label:"Historial",    icon:"📈" },
    { id:"usuarios",     label:"Usuarios",     icon:"👤" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Inter',system-ui,sans-serif", color:C.text }}>
      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"0 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0" }}>
            <div style={{ width:28, height:28, background:C.camel, borderRadius:7,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff" }}>◈</div>
            <span style={{ fontWeight:800, fontSize:16, color:C.text, letterSpacing:"-.2px" }}>Jardymant</span>
            <span style={{ fontWeight:400, fontSize:16, color:C.muted }}>Gestión</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Btn small variant="ghost" onClick={()=>exportCSV(materiales.map(m=>({...m,total:m.precio_unitario*m.cantidad})),"compras.csv")}>↓ Compras</Btn>
            <Btn small variant="ghost" onClick={()=>exportCSV(pagos,"pagos.csv")}>↓ Pagos</Btn>
            <Btn small variant="ghost" onClick={()=>exportCSV(cotizaciones,"cotizaciones.csv")}>↓ Cotizaciones</Btn>
            <Btn small variant="ghost" onClick={fetchAll}>↺ Actualizar</Btn>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", overflowX:"auto" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none", border:"none", cursor:"pointer",
              padding:"12px 16px", fontFamily:"inherit", fontSize:13, fontWeight:600,
              color: tab===t.id ? C.camel : C.muted,
              borderBottom:`2px solid ${tab===t.id ? C.camel : "transparent"}`,
              whiteSpace:"nowrap", transition:"color .15s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px 60px" }}>
        {loading ? <Spinner /> : <>
          {tab==="dashboard"    && <Dashboard    proyectos={proyectos} materiales={materiales} cotizaciones={cotizaciones} pagos={pagos}/>}
          {tab==="proyectos"    && <Proyectos    proyectos={proyectos} reload={fetchAll} materiales={materiales} pagos={pagos}/>}
          {tab==="compras"      && <Compras      materiales={materiales} reload={fetchAll} proyectos={proyectos} usuarios={usuarios}/>}
          {tab==="pagos"        && <Pagos        pagos={pagos} reload={fetchAll} proyectos={proyectos} usuarios={usuarios} cotizaciones={cotizaciones}/>}
          {tab==="cotizaciones" && <Cotizaciones cotizaciones={cotizaciones} reload={fetchAll} proyectos={proyectos}/>}
          {tab==="historial"    && <Historial    materiales={materiales}/>}
          {tab==="usuarios"     && <Usuarios     usuarios={usuarios} reload={fetchAll}/>}
        </>}
      </div>
    </div>
  );
}
