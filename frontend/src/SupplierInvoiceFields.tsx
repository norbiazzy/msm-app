import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import {SingleFilePicker} from './MultiFilePicker';
import {getDocumentRecognition,uploadDealFileWithProgress} from './api';

export function SupplierInvoiceFields({dealId,file,setFile,existingFileId,name,setName,amount,setAmount,onPrepared,disabled=false,showPicker=true}: {
 dealId:string;file:File|null;setFile:(file:File|null)=>void;existingFileId?:string;
 name:string;setName:Dispatch<SetStateAction<string>>;amount:string;setAmount:Dispatch<SetStateAction<string>>;
 onPrepared:(value:{id:string;number?:string}|null)=>void;disabled?:boolean;showPicker?:boolean;
}) {
 const [state,setState]=useState('');
 const uploads=useRef(new WeakMap<File,Promise<{id:string}>>());
 const latest=useRef({name,amount,onPrepared,setName,setAmount});latest.current={name,amount,onPrepared,setName,setAmount};
 useEffect(()=>{
  let live=true;let timer:ReturnType<typeof setTimeout>|undefined;
  const original={name:latest.current.name,amount:latest.current.amount};
  latest.current.onPrepared(null);
  if(!file&&!existingFileId){setState('');return;}
  setState('Загружаем и распознаём счёт…');
  async function start(){
   try{
    let id=existingFileId;
    if(file){let promise=uploads.current.get(file);if(!promise){promise=uploadDealFileWithProgress(dealId,file,'SUPPLIER_INVOICE_DRAFT');uploads.current.set(file,promise);promise.catch(()=>uploads.current.delete(file));}id=(await promise).id;}
    if(!live||!id)return;
    const fileId=id;
    latest.current.onPrepared({id:fileId});
    let attempts=0;
    const load=async()=>{
     try{
      const rec=await getDocumentRecognition(fileId) as {status?:string;result?:{seller?:{name?:string};number?:string;amount?:string};errorText?:string}|null;
      if(!live)return;
      if(!rec||rec.status==='PENDING'||rec.status==='PROCESSING'){if(++attempts>=48){setState('Распознавание ещё не завершено. Можно заполнить реквизиты вручную.');return;}setState('Распознаём счёт… Можно заполнить реквизиты вручную.');timer=setTimeout(load,2500);return;}
      if(rec.status==='DONE'&&rec.result){const d=rec.result;
       if(d.seller?.name)latest.current.setName(current=>current===original.name?d.seller!.name!:current);
       if(d.amount)latest.current.setAmount(current=>current===original.amount?String(d.amount):current);
       latest.current.onPrepared({id:fileId,number:d.number});setState(d.seller?.name&&d.amount?'Данные из счёта заполнены. Проверьте поставщика и сумму.':'Счёт прочитан частично. Проверьте и заполните недостающие реквизиты вручную.');
      }else setState('Распознавание недоступно. Заполните реквизиты вручную — файл сохранён.');
     }catch{if(live)setState('Не удалось получить распознавание. Можно заполнить реквизиты вручную.');}
    };void load();
   }catch(e){if(live)setState('Не удалось загрузить счёт: '+(e instanceof Error?e.message:String(e)));}
  }void start();return()=>{live=false;if(timer)clearTimeout(timer);};
 },[file,existingFileId,dealId]);
 return <div className="supplierInvoiceFields">
  {showPicker&&<div className="field"><span>Входящий счёт</span>{!disabled&&<SingleFilePicker file={file} onChange={setFile}/>}</div>}
  {state&&<small role="status">{state}</small>}
  <div className="purchaseQuickMain">
   <label className="field"><span>Поставщик</span><input value={name} disabled={disabled} onChange={e=>setName(e.target.value)} placeholder="Заполнится из счёта или укажите вручную"/></label>
   <label className="field"><span>Сумма счёта, ₽</span><input inputMode="decimal" value={amount} disabled={disabled} onChange={e=>setAmount(e.target.value)} placeholder="Заполнится из счёта"/></label>
  </div>
 </div>;
}
