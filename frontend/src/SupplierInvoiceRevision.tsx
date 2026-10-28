import {useEffect,useRef,useState} from 'react';
import {SupplierInvoiceFields} from './SupplierInvoiceFields';
import {reviseSupplierInvoice} from './api';
import type {SupplierPurchase,CurrentUser} from './types';
export function SupplierInvoiceRevision({dealId,purchase,user,onChanged}:{dealId:string;purchase:SupplierPurchase;user:CurrentUser;onChanged:()=>void|Promise<void>}){
 const [open,setOpen]=useState(false),[file,setFile]=useState<File|null>(null),[name,setName]=useState(purchase.supplierName),[amount,setAmount]=useState(String(purchase.incomingInvoiceAmount??'')),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [number,setNumber]=useState(purchase.incomingInvoiceNumber||'');
 const numberDirty=useRef(false);
 const [prepared,setPrepared]=useState<{id:string;number?:string}|null>(null);
 useEffect(()=>{if(prepared?.number&&!numberDirty.current)setNumber(prepared.number);},[prepared?.number]);
 if(user.role==='ACCOUNTANT'||purchase.status==='CANCELLED')return null;
 const paid=(purchase.payments||[]).reduce((n,p)=>n+Math.round(Number(p.amount)*100),0)/100;
 const parsed=Number(amount.replace(/\s/g,'').replace(',','.'));
 async function save(){
  if(!prepared||!file||!reason.trim()||!name.trim()||!Number.isFinite(parsed)||parsed<=0){setError('Приложите новый счёт, укажите поставщика, сумму больше нуля и причину изменения.');return;}
  setBusy(true);setError('');try{await reviseSupplierInvoice(dealId,purchase.id,{actorId:user.id,sourceFileId:prepared.id,number:number.trim()||undefined,amount:parsed,supplierName:name.trim(),reason:reason.trim()});await onChanged();setOpen(false);setFile(null);setPrepared(null);setReason('');numberDirty.current=false;}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 return <div className="supplierInvoiceRevision"><button type="button" className="secondary compactButton" disabled={busy} aria-expanded={open} onClick={()=>{setOpen(!open);setError('');}}>{open?'Закрыть корректировку':'Скорректировать счёт'}</button>
 {open&&<div className="supplierRevisionForm"><SupplierInvoiceFields dealId={dealId} file={file} setFile={setFile} name={name} setName={setName} amount={amount} setAmount={setAmount} onPrepared={setPrepared} disabled={busy}/>
 <label className="field"><span>Номер новой версии счёта</span><input value={number} disabled={busy} onChange={e=>{numberDirty.current=true;setNumber(e.target.value);}}/></label>
 <label className="field"><span>Причина изменения</span><input value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>
 {Number.isFinite(parsed)&&parsed>0&&<p>Оплачено: {paid.toLocaleString('ru-RU')} ₽ · {parsed>=paid?'К доплате':'Переплата'}: {Math.abs(parsed-paid).toLocaleString('ru-RU')} ₽</p>}
 <small>Предыдущие документы и оплаты сохраняются. Возврат или зачёт переплаты не выполняются автоматически.</small>
 {error&&<p className="error" role="alert">{error}</p>}<button type="button" className="primary" disabled={busy||!prepared} onClick={()=>void save()}>{busy?'Сохраняем…':'Сохранить новую версию'}</button></div>}
 </div>;
}
