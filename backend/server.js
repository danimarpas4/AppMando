const express = require('express');
const cors = require('cors');
const webPush = require('web-push');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

const JWT_SECRET = process.env.JWT_SECRET || 'appmando_secret_key_dev';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'TU_GOOGLE_CLIENT_ID_AQUI.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const publicVapidKey = 'BGTE_eT0b2qpi2TKMpQW24iAoa01isfir9NuEnvpao1FEvMBGXWP1FEJ_d1FlL11ZBAQMFvTONs9eYi5SnGM3t0';
const privateVapidKey = 'BRrzdSQybCLC80Ib-E_xn-67-telLml0kV6lUl3gvg4';
webPush.setVapidDetails('mailto:contacto@promilitar.es', publicVapidKey, privateVapidKey);

const db = new sqlite3.Database(path.join(__dirname, 'appmando.db'));

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, google_id TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY, user_id INTEGER, subscription TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id INTEGER, title TEXT, alarmTime TEXT, notified INTEGER DEFAULT 0, completed INTEGER DEFAULT 0, color TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS subordinates (id TEXT PRIMARY KEY, user_id INTEGER, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS superiors (id TEXT PRIMARY KEY, user_id INTEGER, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS sports (id TEXT PRIMARY KEY, user_id INTEGER, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS calendar (id TEXT PRIMARY KEY, user_id INTEGER, dateStr TEXT, data TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS shares (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER, viewer_email TEXT)");
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({error: 'Faltan datos'});
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hashedPassword], function(err) {
    if(err) return res.status(400).json({error: 'Email ya registrado'});
    const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({error: 'Usuario no encontrado'});
    if (!user.password) return res.status(400).json({error: 'Por favor, inicia sesión con Google'});
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token });
    } else {
      res.status(400).json({error: 'Contraseña incorrecta'});
    }
  });
});

app.post('/google-login', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (user) {
         const jwtToken = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '30d' });
         return res.json({ token: jwtToken });
      } else {
         db.run("INSERT INTO users (email, google_id) VALUES (?, ?)", [email, payload.sub], function(err) {
           const jwtToken = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });
           res.json({ token: jwtToken });
         });
      }
    });
  } catch (error) {
    res.status(400).json({error: 'Token de Google inválido'});
  }
});

app.post('/subscribe', authenticateToken, (req, res) => {
  db.run("INSERT INTO subscriptions (user_id, subscription) VALUES (?, ?)", [req.user.id, JSON.stringify(req.body)], function(err) {
    res.status(201).json({ id: this.lastID });
  });
});

app.post('/sync', authenticateToken, (req, res) => {
  const { table, id, data } = req.body;
  if (table === 'tasks') {
     const { title, alarmTime, completed, color } = data;
     db.run("INSERT OR REPLACE INTO tasks (id, user_id, title, alarmTime, notified, completed, color) VALUES (?, ?, ?, ?, 0, ?, ?)", 
      [id, req.user.id, title, alarmTime || null, completed ? 1 : 0, color]);
  } else if (table === 'calendar') {
     db.run(`INSERT OR REPLACE INTO ${table} (id, user_id, dateStr, data) VALUES (?, ?, ?, ?)`, [id, req.user.id, data.dateStr, JSON.stringify(data)]);
  } else {
     db.run(`INSERT OR REPLACE INTO ${table} (id, user_id, data) VALUES (?, ?, ?)`, [id, req.user.id, JSON.stringify(data)]);
  }
  res.json({success: true});
});

app.post('/share', authenticateToken, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({error: 'Email requerido'});
  db.run("INSERT INTO shares (owner_id, viewer_email) VALUES (?, ?)", [req.user.id, email], function(err) {
    if (err) return res.status(500).json({error: 'Error al compartir'});
    res.json({success: true});
  });
});

app.get('/shares', authenticateToken, (req, res) => {
  db.all("SELECT viewer_email FROM shares WHERE owner_id = ?", [req.user.id], (err, rows) => {
    res.json(rows || []);
  });
});

app.post('/delete', authenticateToken, (req, res) => {
  const { table, id } = req.body;
  db.run(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, req.user.id]);
  res.json({success: true});
});

app.get('/data', authenticateToken, (req, res) => {
  const result = { tasks: [], subordinates: [], superiors: [], sports: [], calendar: [] };
  const u = req.user.id;
  const email = req.user.email;
  
  // Buscar a qué owner_ids tenemos acceso
  db.all("SELECT owner_id FROM shares WHERE viewer_email = ?", [email], (err, shareRows) => {
    const ownerIds = [u];
    if (shareRows) {
      shareRows.forEach(row => ownerIds.push(row.owner_id));
    }
    
    // Convertir array a string para la query IN (...)
    const inClause = ownerIds.map(() => '?').join(',');
    
    db.all(`SELECT * FROM tasks WHERE user_id IN (${inClause})`, ownerIds, (e, rows) => {
      if(rows) result.tasks = rows.map(r => ({...r, isShared: r.user_id !== u}));
      db.all(`SELECT * FROM subordinates WHERE user_id IN (${inClause})`, ownerIds, (e, rows) => {
        if(rows) result.subordinates = rows.map(r => ({id: r.id, isShared: r.user_id !== u, ...JSON.parse(r.data)}));
        db.all(`SELECT * FROM superiors WHERE user_id IN (${inClause})`, ownerIds, (e, rows) => {
          if(rows) result.superiors = rows.map(r => ({id: r.id, isShared: r.user_id !== u, ...JSON.parse(r.data)}));
          db.all(`SELECT * FROM sports WHERE user_id IN (${inClause})`, ownerIds, (e, rows) => {
            if(rows) result.sports = rows.map(r => ({id: r.id, isShared: r.user_id !== u, ...JSON.parse(r.data)}));
            db.all(`SELECT * FROM calendar WHERE user_id IN (${inClause})`, ownerIds, (e, rows) => {
              if(rows) result.calendar = rows.map(r => ({id: r.id, isShared: r.user_id !== u, ...JSON.parse(r.data)}));
              res.json(result);
            });
          });
        });
      });
    });
  });
});

let lastNotifiedDate = null;
setInterval(() => {
  const now = new Date();
  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // 1. Alarma clásica (tareas con hora específica)
  db.all("SELECT * FROM tasks WHERE notified = 0 AND completed = 0 AND alarmTime = ?", [currentTimeStr], (err, tasks) => {
    if(!err && tasks && tasks.length > 0) {
      tasks.forEach(task => {
        db.all("SELECT * FROM subscriptions WHERE user_id = ?", [task.user_id], (err, subs) => {
          if(err || subs.length === 0) return;
          const payload = JSON.stringify({ title: 'AppMando - Alarma', body: task.title });
          subs.forEach(s => {
            try {
              webPush.sendNotification(JSON.parse(s.subscription), payload).catch(e => {
                if (e.statusCode === 410) db.run("DELETE FROM subscriptions WHERE id = ?", [s.id]);
              });
            } catch(e){}
          });
        });
        db.run("UPDATE tasks SET notified = 1 WHERE id = ?", [task.id]);
      });
    }
  });

  // 2. Tareas de Hoy (a las 07:00)
  if (currentTimeStr === '07:00' && lastNotifiedDate !== `${todayStr}-07:00`) {
    lastNotifiedDate = `${todayStr}-07:00`;
    db.all("SELECT * FROM calendar WHERE dateStr = ?", [todayStr], (err, cals) => {
      if(!err && cals) {
        cals.forEach(cal => {
          try {
            const data = JSON.parse(cal.data);
            if(data.events && data.events.length > 0) {
              const count = data.events.length;
              db.all("SELECT * FROM subscriptions WHERE user_id = ?", [cal.user_id], (err, subs) => {
                if(err || subs.length === 0) return;
                const payload = JSON.stringify({ title: 'Agenda de Hoy', body: `Tienes ${count} eventos/tareas planificadas para hoy.` });
                subs.forEach(s => {
                  try {
                    webPush.sendNotification(JSON.parse(s.subscription), payload).catch(e => {});
                  } catch(e){}
                });
              });
            }
          } catch(e){}
        });
      }
    });
  }

  // 3. Ausencias/Permisos que acaban mañana (a las 20:00)
  if (currentTimeStr === '20:00' && lastNotifiedDate !== `${todayStr}-20:00`) {
    lastNotifiedDate = `${todayStr}-20:00`;
    const checkAbsences = (table, isSuperior) => {
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if(err || !rows) return;
        rows.forEach(r => {
          try {
            const data = JSON.parse(r.data);
            if(data.absences) {
              data.absences.forEach(a => {
                if(a.endDate === tomorrowStr) {
                  db.all("SELECT * FROM subscriptions WHERE user_id = ?", [r.user_id], (err, subs) => {
                    if(err || subs.length === 0) return;
                    const name = isSuperior ? `${data.empleo} ${data.name}` : data.name;
                    const payload = JSON.stringify({ title: 'Fin de Ausencia', body: `El/La ${a.reason} de ${name} finaliza mañana.` });
                    subs.forEach(s => {
                      try {
                        webPush.sendNotification(JSON.parse(s.subscription), payload).catch(e => {});
                      } catch(e){}
                    });
                  });
                }
              });
            }
          } catch(e){}
        });
      });
    };
    checkAbsences('subordinates', false);
    checkAbsences('superiors', true);
  }
}, 30000); 

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend de AppMando Auth corriendo en http://localhost:${PORT}`));
