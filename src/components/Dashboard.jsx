import React, { useState } from 'react';
import { Users, AlertCircle, Calendar as CalendarIcon, Shield, Activity, ListTodo, FileDown } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Dashboard({ data, goToTab, syncData }) {
  const [hoverDefer, setHoverDefer] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfScope, setPdfScope] = useState('day');
  const [pdfOptions, setPdfOptions] = useState({
    presentes: true,
    ausentes: true,
    novedades: true,
    tareasMando: true,
    tareasSubordinados: true,
    deporte: true
  });
  const isAbsentToday = (absences) => {
    if (!absences || !Array.isArray(absences)) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return absences.some(a => {
      if (!a || !a.startDate || !a.endDate) return false;
      return todayStr >= a.startDate && todayStr <= a.endDate;
    });
  };

  const subordinates = data.subordinates || [];
  const tasks = data.tasks || [];
  const superiors = data.superiors || [];
  
  // Find today's events from calendar to see if there's sport
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const calendarArray = data.calendar || [];
  const todayCalendar = calendarArray.find(c => c.dateStr === todayDateStr);
  const todayEvents = todayCalendar ? todayCalendar.events : [];
  const todaySport = todayEvents?.find(e => e.type === 'deporte');
  
  let sportWorkoutText = '';
  if (todaySport && todaySport.sportId) {
     const sportPlan = (data.sports || []).find(s => s.id === todaySport.sportId);
     if (sportPlan && sportPlan.workouts) {
        sportWorkoutText = sportPlan.workouts[`${todaySport.sportWeek}_${todaySport.sportDay}`] || 'Descanso o sesión libre';
     }
  }

  const totalSubs = subordinates.length;
  const absentSubs = subordinates.filter(s => isAbsentToday(s.absences)).length;
  const presentSubs = totalSubs - absentSubs;

  const subTasks = tasks.filter(t => !t.completed && t.color === 'subordinado');
  const urgentTasks = tasks.filter(t => !t.completed && (t.color === '#a8423f' || t.color === 'var(--color-error)'));
  const importantTasks = tasks.filter(t => !t.completed && (t.color === '#bd9b44' || t.color === 'var(--color-warning)'));
  const normalTasks = tasks.filter(t => !t.completed && (t.color === '#ffffff' || t.color === 'var(--color-text)' || t.color === 'var(--color-success)'));

  // Global Analytics
  const totalGlobalTasks = tasks.length;
  const completedGlobalTasks = tasks.filter(t => t.completed).length;
  const taskCompletionRate = totalGlobalTasks > 0 ? Math.round((completedGlobalTasks / totalGlobalTasks) * 100) : 0;
  
  const sickSubs = subordinates.filter(s => s.lesion).length;
  const operationalSubs = Math.max(0, totalSubs - absentSubs - sickSubs);
  const operationalRate = totalSubs > 0 ? Math.round((operationalSubs / totalSubs) * 100) : 0;
  const sickRate = totalSubs > 0 ? Math.round((sickSubs / totalSubs) * 100) : 0;
  const absentRate = totalSubs > 0 ? Math.round((absentSubs / totalSubs) * 100) : 0;

  const generateDashboardPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const docTitle = pdfScope === 'week' ? 'Plan Semanal' : 'Orden Diaria';
    doc.text(`${docTitle} - ${format(new Date(), 'dd/MM/yyyy')}`, 14, 20);
    
    let currentY = 30;

    const checkPageBreak = (neededSpace) => {
      if (currentY + neededSpace > 280) {
        doc.addPage();
        currentY = 20;
      }
    };

    if (pdfOptions.presentes || pdfOptions.ausentes) {
      doc.setFontSize(12);
      doc.setTextColor(74, 117, 60);
      doc.text("ESTADO DEL PERSONAL", 14, currentY);
      currentY += 8;

      let personalData = [];
      if (pdfOptions.presentes) {
         personalData.push(["Fuerza Presente", `${presentSubs} efectivos`]);
      }
      if (pdfOptions.ausentes && absentSubs > 0) {
         subordinates.filter(s => isAbsentToday(s.absences)).forEach(s => {
            personalData.push(["Ausente", `${s.empleo} ${s.name}`]);
         });
      }

      if (personalData.length > 0) {
        autoTable(doc, {
          body: personalData,
          startY: currentY,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });
        currentY = doc.lastAutoTable.finalY + 15;
      } else {
        currentY += 5;
      }
    }

    if (pdfOptions.novedades) {
      const novs = subordinates.filter(s => s.lesion);
      if (novs.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setTextColor(189, 155, 68);
        doc.text("NOVEDADES MÉDICAS", 14, currentY);
        currentY += 8;
        const novData = novs.map(s => [`${s.empleo} ${s.name}`, s.lesion]);
        autoTable(doc, {
          body: novData,
          startY: currentY,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
        currentY = doc.lastAutoTable.finalY + 15;
      }
    }

    let daysToProcess = [new Date()];
    if (pdfScope === 'week') {
       const monday = startOfWeek(new Date(), {weekStartsOn: 1});
       daysToProcess = [0,1,2,3,4].map(offset => addDays(monday, offset));
    }

    daysToProcess.forEach((day, index) => {
       const dateStr = format(day, 'yyyy-MM-dd');
       const dayCalendar = calendarArray.find(c => c.dateStr === dateStr);
       const dayEvents = dayCalendar ? dayCalendar.events : [];
       
       const daySport = dayEvents.find(e => e.type === 'deporte');
       let daySportText = '';
       if (daySport && daySport.sportId) {
         const sportPlan = (data.sports || []).find(s => s.id === daySport.sportId);
         if (sportPlan && sportPlan.workouts) {
            daySportText = sportPlan.workouts[`${daySport.sportWeek}_${daySport.sportDay}`] || 'Descanso o sesión libre';
         }
       }

       const dayUrgent = dayEvents.filter(t => t.type === 'tarea' && (t.priority === '#a8423f' || t.priority === 'var(--color-error)'));
       const dayImportant = dayEvents.filter(t => t.type === 'tarea' && (t.priority === '#bd9b44' || t.priority === 'var(--color-warning)'));
       const dayNormal = dayEvents.filter(t => t.type === 'tarea' && (t.priority === '#ffffff' || t.priority === 'var(--color-text)' || t.priority === 'var(--color-success)'));
       const daySubs = dayEvents.filter(t => t.type === 'subordinado');

       let tks = [];
       if (pdfOptions.tareasMando) {
          dayUrgent.forEach(t => tks.push(["URGENTE", t.title, t.alarmTime || '-']));
          dayImportant.forEach(t => tks.push(["IMPORTANTE", t.title, t.alarmTime || '-']));
          dayNormal.forEach(t => tks.push(["NORMAL", t.title, t.alarmTime || '-']));
       }
       if (pdfOptions.tareasSubordinados) {
          daySubs.forEach(t => tks.push(["SUBORDINADO", t.title, t.alarmTime || '-']));
       }

       if (pdfScope === 'week') {
         if (index > 0) checkPageBreak(40);
         doc.setFontSize(14);
         doc.setTextColor(255, 255, 255);
         doc.setFillColor(74, 117, 60);
         doc.rect(14, currentY, 180, 10, 'F');
         doc.text(format(day, 'EEEE, d MMMM yyyy', {locale: es}).toUpperCase(), 16, currentY + 7);
         currentY += 20;
       }

       if (tks.length > 0 && (pdfOptions.tareasMando || pdfOptions.tareasSubordinados)) {
         checkPageBreak(40);
         doc.setFontSize(12);
         doc.setTextColor(74, 117, 60);
         doc.text("AGENDA Y TAREAS", 14, currentY);
         
         autoTable(doc, {
           head: [['Prioridad', 'Descripción', 'Hora']],
           body: tks,
           startY: currentY + 8,
           theme: 'grid',
           styles: { fontSize: 10 },
           headStyles: { fillColor: [74, 117, 60] }
         });
         currentY = doc.lastAutoTable.finalY + 15;
       }

       if (pdfOptions.deporte && daySport) {
         checkPageBreak(40);
         doc.setFontSize(12);
         doc.setTextColor(74, 117, 60);
         doc.text("INSTRUCCIÓN FÍSICO-MILITAR", 14, currentY);
         currentY += 8;
         
         doc.setFontSize(10);
         doc.setTextColor(0, 0, 0);
         doc.setFont("helvetica", "bold");
         doc.text(daySport.title, 14, currentY);
         currentY += 6;
         
         doc.setFont("helvetica", "normal");
         const splitText = doc.splitTextToSize(daySportText || 'Sin descripción.', 180);
         doc.text(splitText, 14, currentY);
         currentY += (splitText.length * 5) + 15;
       }
    });

    const fileName = pdfScope === 'week' ? `Plan_Semanal_${format(new Date(), 'yyyy-MM-dd')}.pdf` : `Orden_Diaria_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    setShowPdfModal(false);
  };

  return (
    <div className="p-4" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 className="card-title" style={{margin: 0}}>Resumen Operativo</h2>
        <button onClick={() => setShowPdfModal(true)} style={{background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'}} title="Exportar Orden Diaria (PDF)">
          <FileDown size={20} />
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
        <div className="card" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 12px'}}>
          <Users size={32} color="var(--color-primary)" style={{marginBottom: '8px'}} />
          <span style={{fontSize: '2rem', fontWeight: '800', lineHeight: '1', color: 'var(--color-text)'}}>{presentSubs} <span style={{fontSize: '1rem', color: 'var(--color-text-muted)'}}>/ {totalSubs}</span></span>
          <span style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px'}}>Fuerza Presente</span>
        </div>

        {todaySport ? (
          <div className="card" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 12px', borderColor: 'var(--color-primary)', background: 'rgba(74,117,60,0.05)'}}>
            <div onClick={() => goToTab && goToTab('sports', { planId: todaySport.sportId })} style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
              <Activity size={24} color="var(--color-primary)" style={{marginBottom: '4px'}} />
              <span style={{fontSize: '0.95rem', fontWeight: '800', lineHeight: '1.2', color: 'var(--color-primary)'}}>{todaySport.title}</span>
              <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{sportWorkoutText}</span>
            </div>
            <button 
              onMouseEnter={() => setHoverDefer(true)}
              onMouseLeave={() => setHoverDefer(false)}
              onClick={(e) => {
                e.stopPropagation();
                if(!syncData) return;
                const nextDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const currentEvents = todayEvents.filter(ev => ev.id !== todaySport.id);
                syncData('calendar', todayDateStr, { dateStr: todayDateStr, events: currentEvents });
                
                const nextCalendar = calendarArray.find(c => c.dateStr === nextDateStr);
                const nextEvents = nextCalendar ? [...nextCalendar.events] : [];
                nextEvents.push(todaySport);
                syncData('calendar', nextDateStr, { dateStr: nextDateStr, events: nextEvents });
              }}
              className="btn" 
              style={{
                marginTop: '12px', 
                fontSize: '0.75rem', 
                padding: '6px 8px', 
                width: '100%',
                background: hoverDefer ? 'var(--color-primary)' : 'transparent',
                color: hoverDefer ? 'white' : 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                transition: 'all 0.2s ease'
              }}>
              Aplazar a Mañana
            </button>
          </div>
        ) : (
          <div onClick={() => goToTab && goToTab('calendar')} className="card" style={{margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 12px', borderColor: 'var(--color-border)', cursor: 'pointer'}}>
            <Activity size={32} color="var(--color-text-muted)" style={{marginBottom: '8px'}} />
            <span style={{fontSize: '1rem', fontWeight: '800', lineHeight: '1.2', color: 'var(--color-text-muted)'}}>Sin Deporte</span>
            <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}>Asignar en Agenda</span>
          </div>
        )}
      </div>

      <div className="card" style={{margin: 0, padding: '16px'}}>
        <h3 style={{fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}><CalendarIcon size={18}/> Estado del Personal (Hoy)</h3>
        
        {/* Sección de Ausentes */}
        <div style={{marginBottom: '16px'}}>
          <h4 style={{fontSize: '0.85rem', color: 'var(--color-error)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--color-error)', paddingBottom: '4px'}}>Personal Ausente ({subordinates.filter(s => isAbsentToday(s.absences)).length})</h4>
          {subordinates.filter(s => isAbsentToday(s.absences)).length > 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
              {subordinates.filter(s => isAbsentToday(s.absences)).map(s => (
                <div key={`abs-${s.id || s.name}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: 'rgba(168, 66, 63, 0.1)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--color-error)'}}>
                  <span>{s.empleo} {s.name}</span>
                  <span style={{color: 'var(--color-error)', fontWeight: 'bold', fontSize: '0.75rem'}}>AUSENTE</span>
                </div>
              ))}
            </div>
          ) : (
             <p style={{color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0'}}>Nadie ausente hoy.</p>
          )}
        </div>

        {/* Sección de Novedades Médicas */}
        <div>
          <h4 style={{fontSize: '0.85rem', color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--color-warning)', paddingBottom: '4px'}}>Novedades Médicas</h4>
          {subordinates.filter(s => s.lesion).length > 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
              {subordinates.filter(s => s.lesion).map(s => (
                <div key={`les-${s.id || s.name}`} style={{display: 'flex', flexDirection: 'column', fontSize: '0.9rem', background: 'rgba(189, 155, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: 'bold'}}>{s.empleo} {s.name}</span>
                  </div>
                  <span style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px'}}>{s.lesion}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0'}}>Sin novedades médicas reportadas.</p>
          )}
        </div>
      </div>
      
      {/* Inteligencia Operativa (Estadísticas) */}
      <div className="card" style={{margin: 0, padding: '16px'}}>
        <h3 style={{fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}><Activity size={18}/> Inteligencia Operativa</h3>
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem'}}>
              <span style={{color: 'var(--color-text-muted)'}}>Disponibilidad de la Fuerza</span>
              <span style={{fontWeight: 'bold'}}>{operationalRate}% Operativo</span>
            </div>
            <div style={{height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden', display: 'flex'}}>
              <div style={{width: `${operationalRate}%`, background: 'var(--color-success)', height: '100%'}}></div>
              <div style={{width: `${sickRate}%`, background: 'var(--color-warning)', height: '100%'}}></div>
              <div style={{width: `${absentRate}%`, background: 'var(--color-error)', height: '100%'}}></div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>
              <span><span style={{color:'var(--color-success)'}}>●</span> {operationalSubs} Op.</span>
              <span><span style={{color:'var(--color-warning)'}}>●</span> {sickSubs} Novedad</span>
              <span><span style={{color:'var(--color-error)'}}>●</span> {absentSubs} Ausente</span>
            </div>
          </div>

          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem'}}>
              <span style={{color: 'var(--color-text-muted)'}}>Cumplimiento de Tareas Global</span>
              <span style={{fontWeight: 'bold'}}>{taskCompletionRate}% Completado</span>
            </div>
            <div style={{height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden'}}>
              <div style={{width: `${taskCompletionRate}%`, background: '#4285f4', height: '100%', borderRadius: '5px'}}></div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>
              <span>{completedGlobalTasks} Completadas</span>
              <span>{totalGlobalTasks - completedGlobalTasks} Pendientes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{margin: 0, padding: '16px'}}>
        <h3 style={{fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}><ListTodo size={18}/> Desglose de Tareas</h3>
        
        {urgentTasks.length === 0 && importantTasks.length === 0 && normalTasks.length === 0 && (
          <p style={{color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: '8px 0'}}>No hay tareas pendientes en la agenda.</p>
        )}

        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {urgentTasks.map(t => (
            <div key={t.id || t.title} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: 'rgba(168, 66, 63, 0.1)', padding: '8px 12px', borderRadius: '8px', borderLeft: '4px solid var(--color-error)'}}>
              <span>{t.title}</span>
              {t.alarmTime && <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>{t.alarmTime}</span>}
            </div>
          ))}
          {importantTasks.map(t => (
            <div key={t.id || t.title} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: 'rgba(189, 155, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', borderLeft: '4px solid var(--color-warning)'}}>
              <span>{t.title}</span>
              {t.alarmTime && <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>{t.alarmTime}</span>}
            </div>
          ))}
          {normalTasks.map(t => (
            <div key={t.id || t.title} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: 'var(--color-bg)', padding: '8px 12px', borderRadius: '8px', borderLeft: '4px solid var(--color-text)'}}>
              <span>{t.title}</span>
              {t.alarmTime && <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>{t.alarmTime}</span>}
            </div>
          ))}
        </div>
      </div>

      {subTasks.length > 0 && (
        <div className="card" style={{margin: 0, padding: '16px'}}>
          <h3 style={{fontSize: '1rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}><Users size={18}/> Gestiones con Subordinados</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {subTasks.map(t => (
              <div key={t.id || t.title} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: 'rgba(189, 155, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', borderLeft: '4px solid var(--color-warning)'}}>
                <span>{t.title}</span>
                {t.alarmTime && <span style={{fontSize: '0.75rem', color: 'var(--color-text-muted)'}}>{t.alarmTime}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showPdfModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div className="card" style={{width: '90%', maxWidth: '400px'}}>
            <h2 className="card-title">Configurar Documento</h2>
            
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px', background: 'var(--color-bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)'}}>
               <button onClick={() => setPdfScope('day')} style={{flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: pdfScope === 'day' ? 'var(--color-primary)' : 'transparent', color: pdfScope === 'day' ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'}}>Día Actual</button>
               <button onClick={() => setPdfScope('week')} style={{flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: pdfScope === 'week' ? 'var(--color-primary)' : 'transparent', color: pdfScope === 'week' ? 'white' : 'var(--color-text)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s'}}>Semana (L-V)</button>
            </div>

            <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px'}}>Selecciona los bloques de información que deseas exportar:</p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px'}}>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.presentes} onChange={e => setPdfOptions({...pdfOptions, presentes: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span>Fuerza Presente</span>
              </label>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.ausentes} onChange={e => setPdfOptions({...pdfOptions, ausentes: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span>Personal Ausente</span>
              </label>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.novedades} onChange={e => setPdfOptions({...pdfOptions, novedades: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span>Novedades Médicas</span>
              </label>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.tareasMando} onChange={e => setPdfOptions({...pdfOptions, tareasMando: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span style={{wordBreak: 'break-word'}}>Tareas de Mando (Agenda)</span>
              </label>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.tareasSubordinados} onChange={e => setPdfOptions({...pdfOptions, tareasSubordinados: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span style={{wordBreak: 'break-word'}}>Tareas de Subordinados</span>
              </label>
              <label style={{display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4'}}>
                <input type="checkbox" checked={pdfOptions.deporte} onChange={e => setPdfOptions({...pdfOptions, deporte: e.target.checked})} style={{marginTop: '2px', width: 'auto'}} /> <span style={{wordBreak: 'break-word'}}>Instrucción Físico-Militar (Texto completo)</span>
              </label>
            </div>

            <div style={{display: 'flex', gap: '8px'}}>
              <button className="btn btn-secondary" onClick={() => setShowPdfModal(false)} style={{flex: 1}}>Cancelar</button>
              <button className="btn btn-primary" onClick={generateDashboardPDF} style={{flex: 1}}>Exportar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
