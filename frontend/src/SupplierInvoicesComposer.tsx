import {useRef,useState} from 'react';
import {MultiFilePicker,SelectedFileRow} from './MultiFilePicker';
import {SupplierInvoiceFields} from './SupplierInvoiceFields';
import {createSupplierPurchase,requestSupplierPayment,listSupplierPurchases} from './api';
import {AutoTextarea} from './AutoTextarea';

type Draft={key:string;file:File|null;name:string;amount:string;number:string;numberDirty:boolean;prepared:{id:string;number?:string}|null;saved?:string;sent?:boolean;error?:string};
let fallbackSequence=0;
function draftKey():string {
 const api=globalThis.crypto;
 if(typeof api?.randomUUID==='function')return api.randomUUID();
 if(typeof api?.getRandomValues==='function'){
  const bytes=api.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 }
 // Operation identity only: never used as an authentication token or secret.
 return `invoice-${Date.now().toString(36)}-${++fallbackSequence}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
const blank=(file:File|null=null):Draft=>({key:draftKey(),file,name:'',amount:'',number:'',numberDirty:false,prepared:null});
const numeric=(value:string)=>value.trim()?Number(value.replace(/[\s\u00a0\u202f]/g,'').replace(',','.')):undefined;

export function SupplierInvoicesComposer({dealId,actorId,onSaved,onCancel}:{dealId:string;actorId:string;onSaved:(complete:boolean)=>Promise<void>;onCancel?:()=>void}){
 const [drafts,setDrafts]=useState<Draft[]>(()=>[blank()]);
 const [comment,setComment]=useState(''),[urgent,setUrgent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const running=useRef(false);
 const patch=(key:string,fn:(d:Draft)=>Draft,force=false)=>setDrafts(current=>current.map(d=>d.key===key&&(!d.saved||force)?fn(d):d));
 function choose(files:File[]){setDrafts(current=>files.length?files.map(file=>current.find(d=>d.file===file)??blank(file)):[blank()]);}
 async function submit(mode:'SAVE'|'PAY'){
  if(running.current)return;running.current=true;setBusy(true);setMessage('');let failures=0;
  try{
   for(const d of drafts){
    if(d.sent||mode==='SAVE'&&d.saved)continue;
    let amount=numeric(d.amount),name=d.name;
    if(d.saved&&mode==='PAY'){
     try{const stored=(await listSupplierPurchases(dealId)).find(p=>p.id===d.saved);
      if(!stored)throw new Error('Сохранённый счёт не найден');
      name=stored.supplierName;const total=Number(stored.incomingInvoiceAmount??stored.requestedAmount);
      amount=(Math.round(total*100)-(stored.payments||[]).reduce((n,p)=>n+Math.round(Number(p.amount)*100),0))/100;
      patch(d.key,x=>({...x,name:stored.supplierName,amount:String(stored.incomingInvoiceAmount??stored.requestedAmount??'')}),true);
     }catch(e){failures++;patch(d.key,x=>({...x,error:e instanceof Error?e.message:String(e)}),true);continue;}
    }
    if(d.file&&!d.prepared){patch(d.key,x=>({...x,error:'Дождитесь загрузки файла. При ошибке загрузки удалите его и выберите заново.'}),true);failures++;continue;}
    if(amount!==undefined&&(!Number.isFinite(amount)||amount<=0)||mode==='PAY'&&(!name.trim()||name==='Поставщик не указан'||amount===undefined)){
     patch(d.key,x=>({...x,error:'Для оплаты нужны поставщик и сумма больше нуля. Неполный счёт можно сохранить черновиком.'}),true);failures++;continue;
    }
    let saved=d.saved;
    try{
     if(!saved){const purchase=await createSupplierPurchase(dealId,{clientRequestId:d.key,createdById:actorId,supplierName:d.name.trim()||undefined,incomingInvoiceNumber:d.number.trim()||d.prepared?.number,incomingInvoiceAmount:amount,sourceFileId:d.prepared?.id,comment:comment.trim()||undefined});saved=purchase.id;patch(d.key,x=>({...x,saved:purchase.id,error:undefined}),true);}
     if(mode==='PAY'){await requestSupplierPayment(dealId,saved,{clientRequestId:d.key,actorId,amount,comment:comment.trim()||undefined,urgent});patch(d.key,x=>({...x,sent:true,error:undefined}),true);}
    }catch(e){failures++;patch(d.key,x=>({...x,saved,error:e instanceof Error?e.message:String(e)}),true);}
   }
   if(failures)setMessage('Не все счета обработаны. Успешные сохранены; ошибки указаны в карточках. Повторная отправка использует уже созданные карточки.');
   await onSaved(failures===0);
  }catch(e){setMessage('Не удалось обновить список: '+(e instanceof Error?e.message:String(e)));}
  finally{running.current=false;setBusy(false);}
 }
 return <div className="supplierInvoicesComposer">
 <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
  <div className="field"><span>Входящие счета · можно выбрать несколько</span><MultiFilePicker files={drafts.flatMap(d=>d.file?[d.file]:[])} onChange={choose} showSelectedFiles={false} accept=".pdf,.xls,.xlsx,image/*"/></div>
  <div className="supplierDraftList">{drafts.map((d,index)=><section className="supplierInvoiceDraft" key={d.key} aria-label={`Входящий счёт ${index+1}`}>
   {d.file?<SelectedFileRow file={d.file} onRemove={()=>choose(drafts.flatMap(x=>x.key!==d.key&&x.file?[x.file]:[]))}/>:<strong>Черновик без файла</strong>}
   <SupplierInvoiceFields dealId={dealId} file={d.file} setFile={()=>{}} showPicker={false} name={d.name} amount={d.amount}
    setName={value=>patch(d.key,x=>({...x,name:typeof value==='function'?value(x.name):value}))}
    setAmount={value=>patch(d.key,x=>({...x,amount:typeof value==='function'?value(x.amount):value}))}
    onPrepared={prepared=>patch(d.key,x=>({...x,prepared,number:!x.numberDirty&&prepared?.number?prepared.number:x.number}))} disabled={busy||!!d.saved}/>
   <label className="field"><span>Номер счёта</span><input value={d.number} disabled={busy||!!d.saved} onChange={e=>patch(d.key,x=>({...x,number:e.target.value,numberDirty:true}))}/></label>
   {d.saved&&<small>{d.sent?'Запрос оплаты отправлен':'Черновик сохранён. Реквизиты можно изменить в сохранённой карточке.'}</small>}
   {d.error&&<p className="error" role="alert">{d.error}</p>}
  </section>)}</div>
  <label className="field"><span>Комментарий к выбранным счетам · необязательно</span><AutoTextarea rows={2} value={comment} onChange={e=>setComment(e.target.value)}/></label>
  <label className="urgentToggle"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/><span>Срочно</span></label>
  {message&&<p role="alert">{message}</p>}
  <div className="purchaseQuickActions">{onCancel&&<button type="button" className="secondary" onClick={onCancel}>Закрыть</button>}
   <button type="button" className="secondary" onClick={()=>void submit('SAVE')}>{busy?'Сохраняем…':drafts.length>1?'Сохранить счета':'Сохранить'}</button>
   <button type="button" className="primary" onClick={()=>void submit('PAY')}>{busy?'Отправляем…':drafts.length>1?'Отправить счета в оплату':'Отправить в оплату'}</button>
  </div>
 </fieldset>
 </div>;
}
