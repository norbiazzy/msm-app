# MSM_FIXES_V10
#!/usr/bin/env python3
"""MSM recognition worker v1. Input: local document; output: exactly one JSON object to stdout.
No external cloud OCR, no secrets in logs. All results are *visual/document* observations.
Runtime: Python 3.10+, pymupdf, numpy, opencv-python-headless, python-calamine.
"""
from __future__ import annotations
import argparse
import contextlib
from datetime import date
from decimal import Decimal, InvalidOperation
import json
from pathlib import Path
import re
import sys

RU_MONTHS = {'января':1,'февраля':2,'марта':3,'апреля':4,'мая':5,'июня':6,'июля':7,
             'августа':8,'сентября':9,'октября':10,'ноября':11,'декабря':12}
MONEY = r'[\d\s\u00a0]+[,.]\d{2}'
TITLE = re.compile(r'Сч[её]т\s+на\s+оплату\s*№\s*([^\s]+)\s+от\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})', re.I)
ITEM_ROW = re.compile(r'^\s*(\d{1,3})\s{2,}(.+?)\s{2,}([\d\s]+(?:[,.]\d+)?)\s+([^\d\s][^\r\n]*?)\s{2,}('+MONEY+r')\s{2,}('+MONEY+r')\s*$', re.I)


def dec(s):
    if s is None or s == '': return None
    try: return Decimal(str(s).replace(' ', '').replace('\u00a0','').replace('₽','').replace(',','.'))
    except (InvalidOperation,ValueError): return None


def strmoney(s):
    d=dec(s)
    return f'{d:.2f}' if d is not None else None


def iso(day, month, year):
    m=RU_MONTHS.get(str(month).lower())
    try: return date(int(year),m,int(day)).isoformat() if m else None
    except ValueError: return None


def read_pdf(path, detect_stamps=False):
    import fitz
    with fitz.open(path) as pdf:
        pages=[page.get_text(sort=True) for page in pdf]
        marks=stamp_detection(pdf) if detect_stamps else {}
    return pages,marks


def stamp_detection(pdf):
    """Detect blue round ink and blue rectangular EDO sign box separately.
    Conservative: no positive from a bare printed 'М.П.' or a decorative blue logo.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        return {'round_seal':None,'edo_box':None,'method':'visual detector unavailable'}
    round_count=0;edo_box=False
    for page in pdf:
        if page.rect.width==0 or page.rect.height==0: continue
        pm=page.get_pixmap(matrix=__import__('fitz').Matrix(1.25,1.25),alpha=False,colorspace=__import__('fitz').csRGB)
        rgb=np.frombuffer(pm.samples,dtype=np.uint8).reshape(pm.height,pm.width,3)
        hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
        blue=cv2.inRange(hsv,np.array([89,53,38]),np.array([139,255,255]))
        h,w=blue.shape
        # Use the lower 53% of page where signature and EDO stamps are usually placed.
        blue[:int(h*.47),:]=0
        # Blue circular ink is often beside/over the long EDO rectangle.
        # Check a left-lower region *above* the footer; do not merge both marks.
        upper_left=blue[int(h*.68):int(h*.805),int(w*.04):int(w*.32)]
        if np.count_nonzero(upper_left)>450:
            round_count+=1
        # EDO mark: wide, flat, bluish rectangular footer, not round. Textual proof is also checked.
        cnts,_=cv2.findContours(blue,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
        for co in cnts:
            x,y,ww,hh=cv2.boundingRect(co)
            if y>h*.58 and ww>w*.35 and ww>hh*2.1 and hh>10 and cv2.contourArea(co)>130:
                edo_box=True
    return {'round_seal':bool(round_count),'round_seal_count_estimate':round_count,
            'edo_box':edo_box,'method':'image-based color/shape heuristic (not authentication)'}


def around(text,start,end=None):
    # Plain-text order can put a label after its value; prefer values near the semantic label.
    m=re.search(start,text,re.I)
    if not m:return ''
    piece=text[m.end():m.end()+900]
    if end:
        n=re.search(end,piece,re.I)
        if n:piece=piece[:n.start()]
    return piece


def party_from_text(text,label,next_label):
    # PDF tables often place the company on the *same* line as the label, while
    # a secondary (Исполнитель)/(Заказчик) caption appears on the next line.
    m=re.search(label+r'\s+(.+)',text,re.I)
    if not m:return {'name':None,'inn':None}
    piece=text[m.end()-len(m.group(1)):m.end()+550]
    if next_label:
        nxt=re.search(next_label,piece,re.I)
        if nxt:piece=piece[:nxt.start()]
    inn=re.search(r'\bИНН\s*(\d{10,12})\b',piece,re.I)
    company=re.search(r'((?:ООО|АО|ПАО|ИП)\s*[«\"].+?[»\"]|ИП\s+[А-ЯЁ][^,\n]+|физическое лицо)',piece,re.I|re.S)
    val=company.group(1).replace('\n',' ').strip() if company else None
    return {'name':val,'inn':inn.group(1) if inn else None}


def parse_invoice_pdf(pages):
    text='\n'.join(pages)
    title=TITLE.search(text)
    sum_match=re.search(r'Всего\s+к\s+оплате:\s*('+MONEY+')',text,re.I)
    if not sum_match:
        sum_match=re.search(r'\bИтого:\s*('+MONEY+')',text,re.I)
    vat=re.search(r'(?:В\s+том\s+числе\s+)?НДС\s*(\d{1,2})\s*%\s*:\s*('+MONEY+')',text,re.I)
    count=re.search(r'Всего\s+наименований\s+(\d+)',text,re.I)
    items=[];table=False;issues=[]
    for page_no,pg in enumerate(pages,1):
        for line in pg.splitlines():
            if 'Товары (работы, услуги)' in line and 'Кол-во' in line:
                table=True; continue
            if not table: continue
            if re.search(r'\bИтого\s*:',line): table=False;continue
            if not line.strip():continue
            m=ITEM_ROW.match(line)
            if m:
                n,name,qty,unit,price,total=m.groups()
                items.append({'row':int(n),'name':name.strip(),'quantity':str(dec(qty)),
                    'unit':unit.strip(),'price':strmoney(price),'amount':strmoney(total),'page':page_no})
            elif items and not re.match(r'^\s*\d+\s{2,}',line):
                # A continued product name can span two lines, possibly separate PDF pages.
                if not any(word in line for word in ('Номер по порядку','Единица измерения','Материальные ценности')):
                    items[-1]['name']+=' '+line.strip()
            elif not re.match(r'^\s*(?:№|Номер|Кол-во|Ед\.)',line):
                issues.append('Не разобрана строка товарной таблицы (стр. '+str(page_no)+')')
    declared=int(count.group(1)) if count else None
    total=strmoney(sum_match.group(1)) if sum_match else None
    if not title:issues.append('Номер или дата счёта не распознаны')
    if declared is not None and declared!=len(items):issues.append(f'В счёте указано {declared} позиций, прочитано {len(items)}')
    if total and items:
        actual=sum((dec(p['amount']) or Decimal(0) for p in items),Decimal(0))
        if abs(actual-dec(total))>Decimal('0.01'):issues.append('Сумма позиций не совпадает с итогом счёта')
    elif not items:issues.append('Позиции счёта не найдены')
    if not total:issues.append('Итог счёта не распознан')
    supplier=party_from_text(text,r'Поставщик',r'Покупатель')
    buyer=party_from_text(text,r'Покупатель',r'Основание\s*:')
    # Sometimes PDF text displays supplier before the label; avoid inventing names.
    return {'number':title.group(1) if title else None,
            'date':iso(title.group(2),title.group(3),title.group(4)) if title else None,
            'amount':total,'vat_rate':int(vat.group(1)) if vat else None,
            'vat_amount':strmoney(vat.group(2)) if vat else None,
            'seller':supplier,'buyer':buyer,'items':items,'declared_items':declared,'issues':sorted(set(issues))}


def excel_cells(path):
    try:
        from python_calamine import CalamineWorkbook
    except ImportError:
        if path.suffix.lower() == '.xls':
            try: import xlrd
            except ImportError: raise RuntimeError('Для Excel установите зависимости из backend/src/recognition/python-requirements.txt тем же Python, которым запускается распознавание')
            book=xlrd.open_workbook(str(path))
            return [(sheet.name,[sheet.row_values(i) for i in range(sheet.nrows)]) for sheet in book.sheets()]
        raise RuntimeError('Для XLSX требуется python-calamine. Установите backend/src/recognition/python-requirements.txt')
    book=CalamineWorkbook.from_path(str(path))
    return [(name,book.get_sheet_by_name(name).to_python()) for name in book.sheet_names]


def parse_invoice_excel(path):
    sheets=excel_cells(path)
    text='\n'.join(' | '.join(str(v) for v in row if v is not None and str(v).strip()) for _,rows in sheets for row in rows)
    title=re.search(r'(?:Сч[её]т\s+(?:на\s+оплату\s+)?)?№\s*([А-Яа-яA-Za-z0-9-]+)\s+от\s+(\d{1,2})[.\s]+(\d{1,2}|[а-яё]+)[.\s]+(\d{4})',text,re.I)
    number=title.group(1) if title else None
    datevalue=None
    if title:
        try:
            month=RU_MONTHS.get(title.group(3).lower(),int(title.group(3)) if title.group(3).isdigit() else 0)
            datevalue=date(int(title.group(4)),month,int(title.group(2))).isoformat()
        except ValueError: pass
    def party(labels):
        match=re.search(r'(?:^|\n)\s*(?:'+labels+r')\s*[:|]\s*([^\n]{0,1200})',text,re.I)
        content=match.group(1) if match else ''
        name=re.search(r'\b(?:ОБЩЕСТВО\s+С\s+ОГРАНИЧЕННОЙ\s+ОТВЕТСТВЕННОСТЬЮ|ООО|ПАО|ЗАО|ОАО|АО|ИП)\b[^,\n|]*',content,re.I)
        inn=re.search(r'ИНН\s*[:|]?\s*(\d{10,12})\b',content,re.I)
        return {'name':name.group(0).strip() if name else None,'inn':inn.group(1) if inn else None}
    seller=party('Поставщик|Продавец')
    buyer=party('Покупатель|Заказчик')
    items=[];total=None;priority=-1;vat=None
    for sheet_name,rows in sheets:
        header={};quantities=[];units=[]
        for ri,row in enumerate(rows,1):
            vals=[str(c).strip() if c is not None else '' for c in row]
            line=' '.join(v for v in vals if v)
            if not line: continue
            # Remember the actual table columns, including multiple quantity/unit pairs.
            price_cols=[i for i,v in enumerate(vals) if re.fullmatch(r'Цена(?:,?\s*(?:руб\.?|₽))?',v,re.I)]
            sum_cols=[i for i,v in enumerate(vals) if re.fullmatch(r'Сумма(?:,?\s*(?:руб\.?|₽))?',v,re.I)]
            if price_cols and sum_cols:
                header={'price':price_cols[-1],'sum':sum_cols[-1]}
                name_cols=[i for i,v in enumerate(vals) if re.search(r'^(?:Товар|Наименование|Работы|Услуги)',v,re.I)]
                if name_cols:header['name']=name_cols[0]
                row_cols=[i for i,v in enumerate(vals) if re.fullmatch(r'№|N|Номер',v,re.I)]
                if row_cols:header['row']=row_cols[0]
                quantities=[i for i,v in enumerate(vals) if re.search(r'кол[- .]*(?:во|ичество)',v,re.I)]
                units=[i for i,v in enumerate(vals) if re.match(r'^Ед(?:\.|иниц)',v,re.I)]
                continue
            label=next((v.lower().rstrip(':').strip() for v in vals if re.match(r'^(?:итого|всего|в том числе|ндс)',v,re.I)), '')
            numeric=[(i,dec(v)) for i,v in enumerate(vals) if dec(v) is not None]
            if label:
                if re.fullmatch(r'(?:всего|итого)\s+к\s+оплате|итого|всего',label) and numeric:
                    rank=3 if 'оплате' in label else 2
                    if rank>=priority: total=strmoney(numeric[-1][1]);priority=rank
                if re.match(r'^(?:в том числе\s+)?ндс',label) and numeric:
                    rate=re.search(r'(\d{1,2})\s*%',label)
                    vat={'rate':int(rate.group(1)) if rate else None,'amount':strmoney(numeric[-1][1])}
                continue
            if header:
                if max(header.values())>=len(vals):continue
                price=dec(vals[header['price']]);amount=dec(vals[header['sum']])
                # Group rows have quantities and totals but no unit price.
                if price is None or price<=0 or amount is None: continue
                if 'row' in header:
                    row_number=dec(vals[header['row']])
                    if row_number is None or row_number<=0 or row_number!=row_number.to_integral_value():continue
            else:
                if len(numeric)<3:continue
                price=numeric[-2][1];amount=numeric[-1][1]
                if price<=0:continue
            price_index=header.get('price',numeric[-2][0])
            candidates=[(i,q) for i,q in numeric if i<price_index and q>0 and abs(q*price-amount)<=Decimal('0.04')]
            if not candidates:continue
            preferred=[pair for pair in candidates if pair[0] in quantities]
            qi,quantity=(preferred or candidates)[-1]
            if 'name' in header:name=vals[header['name']]
            else:
                labels=[v for v in vals[:price_index] if re.search(r'[а-яёА-ЯЁA-Za-z]',v) and not re.search(r'ИНН|КПП|БИК|Поставщик|Покупатель',v,re.I)]
                name=max(labels,key=len) if labels else ''
            if not name:continue
            # Unit belongs to the quantity used in quantity*price, not to packaging places.
            unit_columns=[i for i in units if qi<i<price_index]
            unit=vals[unit_columns[0]] if unit_columns else next((v for v in vals[qi+1:price_index] if v and dec(v) is None),None)
            items.append({'row':int(dec(vals[header['row']])) if 'row' in header else len(items)+1,'name':name,
                          'quantity':str(quantity),'unit':unit.strip() if unit else None,'price':strmoney(price),'amount':strmoney(amount),'sheet':sheet_name,'sheet_row':ri})
    issues=[]
    declared=re.search(r'Всего\s+наименований\s+(\d+)',text,re.I)
    if not number:issues.append('Не удалось надёжно определить номер Excel-счёта')
    if not seller['name']:issues.append('Проверьте поставщика Excel-счёта')
    if not total:issues.append('Не удалось найти итог Excel-счёта')
    if not items:issues.append('Товарные строки Excel не распознаны — проверьте оригинал')
    if declared and int(declared.group(1))!=len(items):issues.append(f'В счёте указано {declared.group(1)} позиций, прочитано {len(items)}')
    if total and items and abs(sum((dec(i['amount']) for i in items),Decimal(0))-dec(total))>Decimal('.01'):
        issues.append('Сумма Excel-позиций не совпадает с итогом — проверьте групповые строки')
    return {'number':number,'date':datevalue,'amount':total,'vat_rate':vat['rate'] if vat else None,
            'vat_amount':vat['amount'] if vat else None,'seller':seller,'buyer':buyer,'items':items,'issues':issues}


def parse_poa(pages,marks):
    text='\n'.join(pages)
    m=re.search(r'ДОВЕРЕННОСТЬ\s*№\s*(\S+)',text,re.I)
    date_m=re.search(r'Дата выдачи:\s*(\d{1,2})\s+([а-яё]+)\s+(\d{4})',text,re.I)
    end_m=re.search(r'Доверенность действительна по:\s*(\d{1,2})\s+([а-яё]+)\s+(\d{4})',text,re.I)
    org=re.search(r'ООО\s*["«]МСМ["»],?\s*ИНН\s*(\d{10})',text,re.I)
    supplier=re.search(r'На\s+получение\s+от\s+(.+)',text,re.I)
    recipient=re.search(r'Доверенность\s+выдана\s+(.+)',text,re.I)
    who=recipient.group(1).strip() if recipient else None
    # Extract last three-word Russian full name rather than car/trailer string preceding it.
    name_matches=re.findall(r'([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)',who or '')
    full_name=name_matches[-1] if name_matches else None
    pas=re.search(r'Паспорт:\s*серия\s*([^\n]{2,15})\s+№\s*([A-ZА-Я0-9]+)',text,re.I)
    ref=re.search(r'материальных ценностей по\s+([^\n]+)',text,re.I)
    rows=[];in_table=False
    for pn,p in enumerate(pages,1):
        for line in p.splitlines():
            if 'Перечень товарно-материальных ценностей' in line:in_table=True;continue
            if not in_table:continue
            if 'Подпись лица' in line:in_table=False;continue
            mm=re.match(r'^\s*(\d{1,3})\s+(.+?)\s{2,}([а-я0-9³²]+)?\s{2,}([\d\s]+(?:[,.]\d+)?)\s*\(',line,re.I)
            if mm:
                qty=dec(mm.group(4))
                rows.append({'row':int(mm.group(1)),'name':mm.group(2).strip(),'unit':mm.group(3),
                    'quantity':str(qty) if qty else None,'page':pn})
            elif rows and line.strip() and not line.startswith(('Номер','Единица','Материальные','порядку')) and not re.match(r'\s*\d+\s+',line):
                if not line.strip().startswith('('):rows[-1]['name']+=' '+line.strip()
    # Flatten EDO mentions from multiple-page Diadok certificate or 1C-EDO blue footer.
    edo_text=bool(re.search(r'(?:передан\s+через\s+Диадок|подписан\s+и\s+передан\s+через|1С[- ]ЭДО|подпись\s+соответствует\s+файлу)',text,re.I))
    seal=marks.get('round_seal');edo=bool(edo_text or marks.get('edo_box'))
    issues=[]
    if not (seal or edo):issues.append('Не обнаружены круглая печать или отметка ЭДО')
    # Empty materials amounts or generic 'Материалы по счету' are kept as written, not fabricated.
    # Top detachable stub and main authorization page must identify the same person.
    stub = text[:text.find('Линия отреза')] if 'Линия отреза' in text else ''
    stub_names = re.findall(r'([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)', stub)
    stub_names = [n for n in stub_names if n not in ('Дата выдачи Срок','Поставщик Номер дата')]
    stub_name = stub_names[-1] if stub_names else None
    if stub_name and full_name and stub_name != full_name:
        issues.append('Расхождение: на корешке '+stub_name+', в основной части '+full_name)
    if not full_name:issues.append('ФИО доверенного лица не удалось уверенно прочитать')
    return {'number':m.group(1) if m else None,
            'date':iso(*date_m.groups()) if date_m else None,
            'valid_until':iso(*end_m.groups()) if end_m else None,
            'organization':{'name':'ООО «МСМ»' if org else None,'inn':org.group(1) if org else None},
            'supplier':supplier.group(1).strip() if supplier else None,
            'recipient_name':full_name,'passport':{'series':pas.group(1).strip(),'number':pas.group(2)} if pas else None,
            'source_reference':ref.group(1).strip() if ref else None,
            'items':rows,'round_seal_detected':seal,'edo_mark_detected':edo,
            'round_seal_count_estimate':marks.get('round_seal_count_estimate'),
            'authentication_verified':False,'issues':issues}


def parse_payment(pages):
    text='\n'.join(pages)
    number=re.search(r'ПЛАТ[ЕЁ]ЖНОЕ\s+ПОРУЧЕНИЕ\s*(?:N|№)?\s*(\d+)\s+(\d{2}\.\d{2}\.\d{4})',text,re.I)
    # Fields appear in fixed order: first payer INN/amount; second receiver INN.
    payment_section=text.split('Назначение платежа')[0]
    matches=list(re.finditer(r'ИНН\s*(\d{10,12})',payment_section,re.I))
    am=re.search(r'Сумма\s+(\d+)\s*[-=]\s*(\d{2})',text,re.I)
    if am:
        amt=f'{am.group(1)}.{am.group(2)}'
    else:
        eq=re.search(r'Сумма\s+(\d+)\s*=',text,re.I)
        amt=eq.group(1)+'.00' if eq else None
    parties=[]
    for m in matches[:2]:
        after=text[m.end():m.end()+370]
        c=re.search(r'((?:ООО|АО|ПАО)\s*[«\"][^»\"]+[»\"]|ОБЩЕСТВО\s+С\s+ОГРАНИЧЕННОЙ\s+ОТВЕТСТВЕННОСТЬЮ\s*[«\"][^»\"]+[»\"])',after,re.I|re.S)
        parties.append({'inn':m.group(1),'name':re.sub(r'\s+',' ',c.group(1)).strip() if c else None})
    purpose_m=re.search(r'(?m)^(?:Оплата|Доплата|Предоплата|Счет на оплату|За\s+товар|Оплата\s+за\s+товар)(.+?)(?:Назначение платежа|Подписи|$)',text,re.I|re.S)
    purpose=(purpose_m.group(0).split('Назначение платежа')[0].strip() if purpose_m else None)
    invoices=list(dict.fromkeys(re.findall(r'сч[её]т(?:у|а|\s+на\s+оплату)?\s*№\s*([A-Za-zА-Яа-я0-9-]+)',purpose or '',re.I)))
    stamp=re.search(r'\bИСПОЛНЕНО\b\s*(\d{2}\.\d{2}\.\d{4})?',text,re.I)
    return {'number':number.group(1) if number else None,'date':number.group(2) if number else None,
        'amount':strmoney(amt),'payer':parties[0] if parties else None,'recipient':parties[1] if len(parties)>1 else None,
        'purpose':purpose,'referenced_invoices':invoices,
        'executed_mark_detected':bool(stamp),
        'executed_mark_date':stamp.group(1) if stamp else None,
        'bank_execution_verified':False,
        'issues':([] if stamp else ['В PDF не найдена отметка «ИСПОЛНЕНО»'])}


def recognize(path,kind):
    suffix=path.suffix.lower()
    if suffix=='.pdf':
        pages,marks=read_pdf(path,kind=='poa')
        text='\n'.join(pages)
        if len(text.strip())<70:
            raise RuntimeError('PDF без текстового слоя: требуется отдельный OCR для сканов')
        if kind=='invoice':data=parse_invoice_pdf(pages)
        elif kind=='poa':data=parse_poa(pages,marks)
        elif kind=='payment':data=parse_payment(pages)
        else:raise RuntimeError('Unknown type')
        data['pages']=len(pages)
    elif suffix in ('.xls','.xlsx') and kind=='invoice':
        data=parse_invoice_excel(path);data['pages']=None
    else:raise RuntimeError('Формат не поддерживается: '+suffix)
    data['kind']=kind
    data['engine_version']='msm-recognition-1.2'
    return data

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--kind',required=True,choices=['invoice','poa','payment']);p.add_argument('--input',required=True,type=Path)
    a=p.parse_args()
    try:
        with contextlib.redirect_stdout(sys.stderr):
            result=recognize(a.input,a.kind)
        print(json.dumps({'ok':True,'data':result},ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok':False,'error':str(e),'kind':a.kind},ensure_ascii=False))
        sys.exit(1)
