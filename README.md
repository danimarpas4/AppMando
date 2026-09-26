# AppMando

**Gestión de tareas, subordinados y agenda propia, en una sola app.**

AppMando nació de una necesidad real: soy militar y llevaba el control de mis tareas,
mi agenda y el estado de mis subordinados repartido entre la libreta, varios chats y
hojas de cálculo que nunca estaban sincronizadas. Cuando algo se olvidaba, se pagaba
caro. Así que construí la herramienta que necesitaba: una app donde tener claro todo
lo que tengo que hacer, con quién tengo que contar y en qué estado está cada persona.

No es un proyecto de Idea. Es la app que usaba cada día, publicada tal cual.

---

## Qué hace

| Módulo | Para qué sirve |
|---|---|
| **Resumen** | Panel con el estado del día: tareas pendientes, agenda, bajas y novedades de los subordinados. |
| **Calendario** | Agenda de tareas por día, con los distintos tipos (tarea, deporte, novedad, superior). Exportación a **PDF** para imprimir o entregar en el parte. |
| **Deporte** | Control de las sesiones de deporte de cada persona. |
| **Subordinados** | Ficha de cada subordinado: lesión, disponibilidad, estado y tareas asignadas. |
| **Superiores** | Registro de los superiores con los que hay que contar. |
| **Asistente de voz** | Dictas una novedad y la app la guarda sola: «*esguince de García*» registra la novedad médica de García; «*llamar al centro de operaciones de Pérez*» le crea la tarea de hoy a Pérez. Pide confirmación antes de guardar, así que nunca se equivoca solo. |
| **Compartir** | Comparte tus datos con otro usuario por correo, sin montar otro servidor ni ceder nada. |
| **Avisos (push)** | Notificación en el móvil cuando hay una tarea pendiente. |
| **PWA** | Se instala en el móvil y en el ordenador como una app nativa, sin tienda de aplicaciones. |

Todo se sincroniza con el servidor al guardar, y funciona en el móvil, en el
ordenador o en una tableta.

---

## Cómo está hecha

**Frontend**
- React 18 + Vite 5
- JavaScript puro, sin TypeScript
- `date-fns` para el manejo de fechas
- `jsPDF` + `jspdf-autotable` para la exportación a PDF
- `html2canvas` para las previsualizaciones
- `@react-oauth/google` para el acceso con cuenta Google
- `lucide-react` para los iconos
- Web Speech API para el asistente de voz
- **Capacitor 6** para empaquetar la misma web como app Android nativa
- PWA instalable (service worker + manifest)

**Backend**
- Node.js + Express
- SQLite (fichero único, cero administración)
- Autenticación: Google OAuth y usuario/contraseña con **bcrypt**
- Sesiones con **JWT**
- **Web Push** para las notificaciones
- Sin Docker y sin servicios externos: `npm install && node server.js`

---

## Estructura

```
.
├── src/                    # Frontend React
│   ├── App.jsx             # Navegación y estado global
│   ├── components/         # Un componente por módulo
│   │   ├── Auth.jsx            # Login (Google + usuario/contraseña)
│   │   ├── Dashboard.jsx      # Resumen
│   │   ├── Calendar.jsx        # Agenda + export PDF
│   │   ├── Sports.jsx          # Control deportivo
│   │   ├── Subordinates.jsx    # Subordinados
│   │   ├── Superiors.jsx       # Superiores
│   │   ├── VoiceAssistant.jsx  # Asistente por voz
│   │   ├── InstallPrompt.jsx   # Instalación como PWA
│   │   └── Settings.jsx        # Ajustes
│   ├── index.css           # Estilos (tema claro/oscuro)
│   └── main.jsx            # Arranque
├── backend/
│   └── server.js           # API Express + SQLite
├── android/                # Proyecto Android (Capacitor)
├── public/                 # Recursos estáticos
├── capacitor.config.json
└── vite.config.js
```

---

## Cómo lo arranco

### 1. La web

```bash
npm install
npm run dev          # desarrollo
npm run build        # genera dist/
npm run preview      # sirve dist/ en local
```

### 2. La API

```bash
cd backend
npm install
node server.js       # por defecto en el puerto 3000
```

La base de datos se crea sola en `backend/appmando.db` al arrancar la primera vez.
Ese fichero **no** está en el repositorio a propósito: es la información real de
gente y no se publica.

### 3. Variables de entorno (backend)

El backend arranca sin configurar nada, pero en producción hay que ponerlo:

| Variable | Para qué sirve |
|---|---|
| `JWT_SECRET` | **Obligatoria en producción.** Firma las sesiones. |
| `GOOGLE_CLIENT_ID` | ID de cliente de Google para el acceso con Google. |
| `PORT` | Puerto del servidor (3000 por defecto). |
| `VAPID_*` | Claves de las notificaciones push (ver `backend/vapid.json`). |

### 4. La app Android

```bash
npm run build
npx cap add android       # solo la primera vez
npx cap sync
npx cap open android      # abre Android Studio
```

---

## Seguridad y privacidad

- **Este repositorio no contiene ningún dato real.** Ni usuarios, ni tareas, ni nombres,
  ni correos. Los ficheros sensibles (`appmando.db`, `vapid.json`, `.env`) están
  en `.gitignore`.
- Las contraseñas se guardan **cifradas con bcrypt**, nunca en claro.
- Los tokens de sesión van **firmados con JWT** y caducan a los 30 días.
- `JWT_SECRET` **nunca** se sube al repositorio. Si se deja el valor de ejemplo,
  cualquiera podría fabricar sesiones válidas: cámbialo antes de publicar la app.
- La API nunca mezcla los datos de un usuario con los de otro: todo va filtrado por su ID.

---

## Estado

Versión estable y en uso diario. El código es el mismo que está sirviendo la app en
producción, sin adornos ni extras.

Si te sirve, úsala. Si quieres mejorarla, abre un issue o mándame un pull request.

---

*Hecho con la misma lógica con la que se organiza una unidad: información clara,
tareas con responsable y nada que se pierda por el camino.*
