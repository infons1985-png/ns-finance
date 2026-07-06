import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home, Inbox, CheckCircle2, Clock3, AlertCircle, Users, FolderArchive, BarChart3,
  Settings, Plus, Landmark, Play, Mail, FileText, CalendarDays, Upload, Search,
  Camera, ReceiptText, Trash2, ShieldCheck, Database, FileSpreadsheet
} from 'lucide-react';
import { supabase } from './supabaseClient';
import './style.css';

const SUPABASE_CONNECTED = Boolean(supabase);

const initialInvoices = [
  { id: 1, supplier: 'STARK', fileName: 'STARK faktura 123456.pdf', amount: 123.45, invoiceDate: '15.07.2026', source: 'Upload', status: 'Čeka uplatu', paymentDate: '', fileType: 'PDF' },
  { id: 2, supplier: 'Bilka', fileName: 'Bilka kvittering.jpg', amount: 499.00, invoiceDate: '14.07.2026', source: 'Fizički račun', status: 'Za provjeru', paymentDate: '', fileType: 'Slika' },
  { id: 3, supplier: 'Norlys', fileName: 'Norlys juli.pdf', amount: 899.00, invoiceDate: '18.07.2026', source: 'Gmail', status: 'Čeka uplatu', paymentDate: '', fileType: 'PDF' },
];

const bankRowsDemo = [
  { id: 'b1', date: '28.07.2026', text: 'DISTRIKT FAKTURA 4444', amount: 123.45, status: 'Upareno', match: 'STARK faktura 123456.pdf' },
  { id: 'b2', date: '14.07.2026', text: 'Kort køb BILKA', amount: 499.00, status: 'Za provjeru', match: 'Bilka kvittering.jpg' },
  { id: 'b3', date: '22.07.2026', text: 'Ukendt betaling', amount: 249.00, status: 'Nedostaje račun', match: '' },
];

function money(value) {
  return Number(value || 0).toLocaleString('da-DK', { style: 'currency', currency: 'DKK' });
}

function guessSupplier(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  const first = base.split(' ')[0] || 'Novi račun';
  return first.length <= 2 ? 'Novi račun' : first.toUpperCase();
}

function StatCard({ icon: Icon, title, value, subtitle }) {
  return <div className="stat-card"><div className="stat-top"><Icon size={30} /><span>{title}</span></div><strong>{value}</strong><p>{subtitle}</p><div className="spark" /></div>;
}

function NavItem({ icon: Icon, label, badge, active }) {
  return <div className={'nav-item ' + (active ? 'active' : '')}><Icon size={21} /><span>{label}</span>{badge !== undefined && <em>{badge}</em>}</div>;
}

function Action({ icon: Icon, title, sub, onClick }) {
  return <button className="action" onClick={onClick}><span><Icon size={25} /></span><div><b>{title}</b><small>{sub}</small></div><i>›</i></button>;
}

function StatusPill({ status }) {
  const cls = status === 'Plaćen' || status === 'Upareno' ? 'ok' : status === 'Za provjeru' ? 'warn' : status === 'Nedostaje račun' ? 'bad' : '';
  return <em className={'pill ' + cls}>{status}</em>;
}

function App() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [bankRows, setBankRows] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('Spremno za skupljanje računa za 7. mjesec.');
  const invoiceInput = useRef(null);
  const bankInput = useRef(null);

  const stats = useMemo(() => ({
    inbox: invoices.length,
    paid: invoices.filter(x => x.status === 'Plaćen').length,
    waiting: invoices.filter(x => x.status === 'Čeka uplatu').length,
    review: invoices.filter(x => x.status === 'Za provjeru').length,
    missing: bankRows.filter(x => x.status === 'Nedostaje račun').length,
  }), [invoices, bankRows]);

  const visibleInvoices = invoices.filter(inv =>
    `${inv.supplier} ${inv.fileName} ${inv.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvoiceFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const newInvoices = files.map((file) => ({
      id: Date.now() + Math.random(),
      supplier: guessSupplier(file.name),
      fileName: file.name,
      amount: 0,
      invoiceDate: new Date().toLocaleDateString('da-DK'),
      source: file.type.startsWith('image/') ? 'Fizički račun' : 'Upload',
      status: 'Čeka uplatu',
      paymentDate: '',
      fileType: file.type.startsWith('image/') ? 'Slika' : 'PDF',
      localUrl: URL.createObjectURL(file),
    }));
    setInvoices(prev => [...newInvoices, ...prev]);
    setSelectedFile(newInvoices[0]);
    setNote(`${files.length} račun(a) dodano u Inbox.`);
    event.target.value = '';
  };

  const handleBankFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBankRows(bankRowsDemo);
    setNote(`Bankovni izvod učitan: ${file.name}. Demo uparivanje je spremno.`);
    event.target.value = '';
  };

  const processMonth = () => {
    if (!bankRows.length) {
      setBankRows(bankRowsDemo);
    }
    setInvoices(prev => prev.map(inv => {
      const match = bankRowsDemo.find(row => row.match === inv.fileName || Math.abs(row.amount - inv.amount) < 0.01);
      if (match?.status === 'Upareno') return { ...inv, status: 'Plaćen', paymentDate: match.date };
      if (match?.status === 'Za provjeru') return { ...inv, status: 'Za provjeru', paymentDate: match.date };
      return inv;
    }));
    setNote('Srpanj je obrađen. Provjeri stavke označene žuto/crveno.');
  };

  const removeInvoice = (id) => {
    setInvoices(prev => prev.filter(x => x.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
  };

  return <div className="app-shell">
    <input ref={invoiceInput} type="file" multiple accept="application/pdf,image/*" hidden onChange={handleInvoiceFiles} />
    <input ref={bankInput} type="file" accept=".csv,.xlsx,.xls,.pdf" hidden onChange={handleBankFile} />

    <aside className="sidebar">
      <div className="brand logo-brand"><img src="/ns-logo.png" alt="N&S Anlægsgartner ApS" /><div><h1>N&S Finance</h1><p>Anlægsgartner ApS</p></div></div>
      <nav>
        <NavItem icon={Home} label="Dashboard" active />
        <NavItem icon={Inbox} label="Inbox" badge={stats.inbox} />
        <NavItem icon={CheckCircle2} label="Plaćeni računi" badge={stats.paid} />
        <NavItem icon={Clock3} label="Neplaćeni računi" badge={stats.waiting} />
        <NavItem icon={AlertCircle} label="Za provjeru" badge={stats.review} />
        <NavItem icon={Users} label="Dobavljači" />
        <NavItem icon={FolderArchive} label="Arhiva" />
        <NavItem icon={BarChart3} label="Izvještaji" />
        <NavItem icon={Settings} label="Postavke" />
      </nav>
      <div className="profile"><span>AM</span><div><b>Andreja M.</b><small>N&S Business</small></div><i>›</i></div>
    </aside>

    <main>
      <header>
        <div><h2>Dobro došla, Andreja!</h2><p>{note}</p></div>
        <button className="month"><CalendarDays size={20} /> Srpanj 2026 <span>⌄</span></button>
      </header>

      <section className="status-strip">
        <div><ShieldCheck size={18} /> Netlify online</div>
        <div><Database size={18} /> Supabase spojen</div>
        <div><ReceiptText size={18} /> Fizički računi: upload u Inbox</div>
      </section>

      <section className="stats">
        <StatCard icon={Inbox} title="Inbox" value={stats.inbox} subtitle="računa skupljeno" />
        <StatCard icon={CheckCircle2} title="Plaćeni" value={stats.paid} subtitle="prema bankovnom izvodu" />
        <StatCard icon={Clock3} title="Čeka uplatu" value={stats.waiting} subtitle="još nisu upareni" />
        <StatCard icon={AlertCircle} title="Za provjeru" value={stats.review + stats.missing} subtitle="treba ručna potvrda" />
      </section>

      <section className="grid">
        <div className="panel tower"><h3>Finance Control Tower</h3><div className="tower-body"><div className="donut"><span>{stats.inbox}</span><small>Ukupno računa<br />za 7. mjesec</small></div><div className="legend"><h4>Status računa</h4><p><span className="green" /> Plaćeni <b>{stats.paid}</b></p><p><span className="gold" /> Čeka uplatu <b>{stats.waiting}</b></p><p><span className="grey" /> Za provjeru <b>{stats.review}</b></p><p><span className="red" /> Nedostaje račun <b>{stats.missing}</b></p></div></div></div>

        <div className="panel actions"><h3>Brze akcije</h3>
          <Action icon={Plus} title="Dodaj račun" sub="Upload PDF-a ili slike računa" onClick={() => invoiceInput.current.click()} />
          <Action icon={Camera} title="Uslikani fizički račun" sub="Stavi isti račun i ovdje, prije/slije e-conomic" onClick={() => invoiceInput.current.click()} />
          <Action icon={Landmark} title="Učitaj bankovni izvod" sub="PDF, CSV ili Excel" onClick={() => bankInput.current.click()} />
          <Action icon={Play} title="Obradi mjesec" sub="Upari račune s bankom" onClick={processMonth} />
          <Action icon={Mail} title="Gmail" sub="Kasnije: automatski uvoz" />
          <Action icon={FileText} title="e-Boks" sub="Kasnije: uvoz računa" />
        </div>

        <div className="panel activity"><h3>Nedavne aktivnosti</h3>{invoices.slice(0, 5).map(inv => <div className="row" key={inv.id}><FileText size={22} /><div><b>{inv.supplier}</b><small>{inv.fileName}</small></div><span>{inv.invoiceDate}</span><StatusPill status={inv.status} /></div>)}<button className="more">Prikaži sve aktivnosti</button></div>

        <div className="panel monthly"><h3>Mjesečni pregled</h3><p>Broj računa po mjesecu plaćanja</p><div className="bars"><i style={{ height: '44%' }} /><i style={{ height: '52%' }} /><i style={{ height: '60%' }} /><i style={{ height: '64%' }} /><i className="active" style={{ height: '75%' }} /></div><div className="bar-labels"><span>Ožu</span><span>Tra</span><span>Svi</span><span>Lip</span><span>Srp</span></div></div>
      </section>

      <section className="workspace">
        <div className="panel inbox-panel"><div className="panel-title"><h3>Inbox računi</h3><label><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Traži dobavljača ili račun..." /></label></div><table><thead><tr><th>Status</th><th>Dobavljač</th><th>Datum računa</th><th>Iznos</th><th>Izvor</th><th></th></tr></thead><tbody>{visibleInvoices.map(inv => <tr key={inv.id} onClick={() => setSelectedFile(inv)}><td><StatusPill status={inv.status} /></td><td>{inv.supplier}</td><td>{inv.invoiceDate}</td><td>{money(inv.amount)}</td><td>{inv.source}</td><td><button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeInvoice(inv.id); }}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>

        <div className="panel preview-panel"><h3>Pregled računa</h3>{selectedFile ? <><div className="preview-card"><FileSpreadsheet size={34} /><div><b>{selectedFile.fileName}</b><small>{selectedFile.fileType} · {selectedFile.source}</small></div></div>{selectedFile.localUrl ? (selectedFile.fileType === 'Slika' ? <img className="receipt-preview" src={selectedFile.localUrl} alt="Pregled računa" /> : <iframe className="pdf-preview" src={selectedFile.localUrl} title="PDF pregled" />) : <div className="empty-preview">Ovdje će se prikazati PDF/slika kada dodaš stvarni račun.</div>}<div className="details"><p><b>Dobavljač:</b> {selectedFile.supplier}</p><p><b>Iznos:</b> {money(selectedFile.amount)}</p><p><b>Status:</b> {selectedFile.status}</p><p><b>Plaćeno:</b> {selectedFile.paymentDate || 'nije još upareno'}</p></div></> : <div className="empty-preview">Klikni račun iz Inboxa za pregled.</div>}</div>
      </section>

      {!!bankRows.length && <section className="panel bank-panel"><h3>Bankovni izvod – demo uparivanje</h3><table><thead><tr><th>Datum</th><th>Tekst na banci</th><th>Iznos</th><th>Status</th><th>Račun</th></tr></thead><tbody>{bankRows.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.text}</td><td>{money(row.amount)}</td><td><StatusPill status={row.status} /></td><td>{row.match || '—'}</td></tr>)}</tbody></table></section>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
