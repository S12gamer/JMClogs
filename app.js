/************ FIREBASE CONFIG ************/
const firebaseConfig = {
  apiKey: "AIzaSyCJrD1eO4nL1_bcZW6-TJZS0bx_3fuz6IY",
  authDomain: "dbsss001-7053d.firebaseapp.com",
  databaseURL: "https://dbsss001-7053d-default-rtdb.firebaseio.com",
  projectId: "dbsss001-7053d",
  storageBucket: "dbsss001-7053d.firebasestorage.app",
  messagingSenderId: "298316695468",
  appId: "1:298316695468:web:1f86d0983149da9b97dc09",
  measurementId: "G-6XXY2QYR8H"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

/** * IMPLEMENTACIÓN DE APP CHECK 
 * Esto asegura que solo tu dominio s12gamer.github.io pueda escribir datos.
 **/
const appCheck = firebase.appCheck();
appCheck.activate(
  'TU_ID_DE_CLAVE_DE_RECAPTCHA', // <--- PEGA AQUÍ TU SITE KEY
  true // Refresco automático de tokens
);

const db = firebase.database();
const auth = firebase.auth();

/************ FUNCIONES DE APOYO ************/
function fixDriveUrl(url) {
  if (!url) return "";
  let cleanUrl = url.replace(/\\/g, "").replace(/"/g, "").trim();
  const match = cleanUrl.match(/id=([^&]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?sz=w1000&id=${match[1]}`;
  }
  return cleanUrl;
}

/************ AUTH ************/
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const err = document.getElementById("loginError");

  if (!email || !password) {
    err.textContent = "Ingresa correo y contraseña";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .catch(e => err.textContent = e.message);
}

function logout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = "none";
    appUI.style.display = "grid";
    loadUsers();
    loadStdidList();
    loadWorks();
  } else {
    loginScreen.style.display = "grid";
    appUI.style.display = "none";
  }
});

/************ MODALES ************/
function openAddUserModal() {
  addUserModal.style.display = "flex";
}
function closeAddUserModal() {
  addUserModal.style.display = "none";
}
function closeListModal() {
  listModal.style.display = "none";
}

/************ WORKS ************/
function loadWorks() {
  db.ref("/Lists/works").once("value", s => {
    worksCheckbox.checked = s.val() === "yes";
  });
}
function toggleWorks() {
  db.ref("/Lists/works").set(worksCheckbox.checked ? "yes" : "no");
}

/************ STDID ************/
function loadStdidList() {
  filterStdid.innerHTML = '<option value="">Todos</option>';
  addStdid.innerHTML = '<option value="">Seleccionar</option>';

  db.ref("/").once("value", snap => {
    const set = new Set();
    snap.forEach(u => {
      const data = u.val();
      // Verificamos que no sea el nodo "Lists" antes de procesar como usuario
      if (u.key !== "Lists" && data && data.stdid && !set.has(data.stdid)) {
        set.add(data.stdid);
        [filterStdid, addStdid].forEach(s => {
          const o = document.createElement("option");
          o.value = data.stdid;
          o.textContent = data.stdid;
          s.appendChild(o);
        });
      }
    });
  });
}

/************ USERS ************/
function loadUsers(filter = null) {
  users.innerHTML = "Cargando...";
  db.ref("/").once("value", snap => {
    users.innerHTML = "";
    snap.forEach(u => {
      if (u.key === "Lists") return; // Ignorar nodo de configuración
      const d = u.val();
      if (!d.stdid || (filter && d.stdid !== filter)) return;

      users.innerHTML += `
        <div class="card">
          <b>${u.key}</b><br>
          Tienda: ${d.stdid}<br>
          <button class="secondary" onclick="viewList('${u.key}')">Ver lista</button>
        </div>
      `;
    });
  });
}

function filterUsers() {
  loadUsers(filterStdid.value || null);
}

/************ LIST ************/
function viewList(username) {
  const modal = document.getElementById("listModal");
  const listDiv = document.getElementById("fullList");
  const latest = document.getElementById("latestEntry");
  const chk = document.getElementById("userWorkCheckbox");

  listDiv.innerHTML = "";
  latest.textContent = "Cargando registros...";

  db.ref(`/${username}/work`).once("value", snap => {
    chk.checked = snap.val() === "yes";
  });

  chk.onchange = () => {
    db.ref(`/${username}/work`).set(chk.checked ? "yes" : "no");
  };

  db.ref(`/${username}/list`).once("value", snap => {
    if (!snap.exists()) {
      listDiv.textContent = "Sin registros";
      latest.textContent = "";
      modal.style.display = "flex";
      return;
    }

    let latestKey = null;
    let latestDate = null;
    let latestImages = { entry: null, exit: null };

    snap.forEach(dateSnap => {
      const parts = dateSnap.key.split(" ");
      if (parts.length !== 3) return;
      const dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!latestDate || dateObj > latestDate) {
        latestDate = dateObj;
        latestKey = dateSnap.key;
        const v = dateSnap.val();
        latestImages.entry = v.Entryimage || v.EntryImage || v.entryimage || v.entryImage || null;
        latestImages.exit = v.Exitimage || v.ExitImage || v.exitimage || v.exitImage || null;
      }
    });

    snap.forEach(dateSnap => {
      const rec = dateSnap.val();
      const entryTime = (rec.entry || "—").replace(/"/g, "");
      const exitTime = (rec.exit || "—").replace(/"/g, "");
      const div = document.createElement("div");
      div.className = "record" + (dateSnap.key === latestKey ? " latest" : "");
      div.innerHTML = `
        <strong>${dateSnap.key}</strong><br>
        <span class="muted">Entrada:</span> ${entryTime}<br>
        <span class="muted">Salida:</span> ${exitTime}
      `;
      listDiv.appendChild(div);
    });

    latest.textContent = latestKey ? `Registro más reciente: ${latestKey}` : "";

    if (latestImages.entry || latestImages.exit) {
      const btn = document.createElement("button");
      btn.className = "secondary";
      btn.style.width = "100%";
      btn.style.marginBottom = "10px";
      btn.textContent = "Ver fotos del último registro";

      const imgBox = document.createElement("div");
      imgBox.style.display = "none";
      imgBox.style.gap = "10px";
      imgBox.style.justifyContent = "center";
      imgBox.style.padding = "10px";
      imgBox.style.background = "#f4f4f4";
      imgBox.style.borderRadius = "8px";
      imgBox.style.marginBottom = "15px";

      const imgContainerStyle = "flex: 1; min-width: 0; text-align: center;";
      const imgStyle = "width: 100%; max-height: 200px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd;";

      if (latestImages.entry) {
        imgBox.innerHTML += `
          <div style="${imgContainerStyle}">
            <small>Entrada</small><br>
            <img src="${fixDriveUrl(latestImages.entry)}" referrerpolicy="no-referrer" style="${imgStyle}">
          </div>
        `;
      }

      if (latestImages.exit) {
        imgBox.innerHTML += `
          <div style="${imgContainerStyle}">
            <small>Salida</small><br>
            <img src="${fixDriveUrl(latestImages.exit)}" referrerpolicy="no-referrer" style="${imgStyle}">
          </div>
        `;
      }

      btn.onclick = () => {
        const isHidden = imgBox.style.display === "none";
        imgBox.style.display = isHidden ? "flex" : "none";
        btn.textContent = isHidden ? "Ocultar fotos" : "Ver fotos del último registro";
      };

      listDiv.prepend(imgBox);
      listDiv.prepend(btn);
    }

    modal.style.display = "flex";
  });
}

/************ ADD USER ************/
function addUser() {
  const nameVal = document.getElementById("username").value.trim();
  const stdidVal = String(document.getElementById("addStdid").value).trim();

  if (!nameVal || !stdidVal) return alert("Completa todo");

  db.ref(`/${nameVal}`).set({
    stdid: stdidVal, 
    work: "no",
    list: {}
  }).then(() => {
    document.getElementById("username").value = "";
    document.getElementById("addStdid").value = ""; 
    closeAddUserModal();
    loadUsers();
  }).catch(e => console.error("Error al guardar:", e));
}