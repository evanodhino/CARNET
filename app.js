// Carnet — logique de l'application
// Utilise Supabase Auth (inscription/connexion) et la table "entries"
// pour stocker les notes de chaque utilisateur, protégées par Row Level Security.

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginMsg = document.getElementById("loginMsg");
const signupMsg = document.getElementById("signupMsg");
const whoName = document.getElementById("whoName");
const feed = document.getElementById("feed");

function showLogin() {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.hidden = false;
  signupForm.hidden = true;
  loginMsg.textContent = "";
  signupMsg.textContent = "";
}
function showSignup() {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.hidden = false;
  loginForm.hidden = true;
  loginMsg.textContent = "";
  signupMsg.textContent = "";
}
tabLogin.addEventListener("click", showLogin);
tabSignup.addEventListener("click", showSignup);

function dateLabel(ts) {
  try {
    return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return ""; }
}

async function loadEntries() {
  feed.innerHTML = "";
  const { data, error } = await supabaseClient
    .from("entries")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Impossible de charger vos entrées : " + error.message;
    feed.appendChild(empty);
    return;
  }

  if (!data.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Aucune entrée pour l'instant. Écrivez la première ci-dessus.";
    feed.appendChild(empty);
    return;
  }

  data.forEach((p) => {
    const card = document.createElement("article");
    card.className = "post";

    const meta = document.createElement("div");
    meta.className = "meta";
    const right = document.createElement("span");
    right.textContent = dateLabel(p.created_at);
    meta.appendChild(right);

    const h3 = document.createElement("h3");
    h3.textContent = p.title;

    const body = document.createElement("p");
    body.textContent = p.content;

    card.appendChild(meta);
    card.appendChild(h3);
    card.appendChild(body);
    feed.appendChild(card);
  });
}

async function enterApp(user) {
  authView.hidden = true;
  appView.hidden = false;
  whoName.textContent = user.email;
  await loadEntries();
}

function leaveApp() {
  appView.hidden = true;
  authView.hidden = false;
  showLogin();
}

// Restaure la session si l'utilisateur est déjà connecté
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) enterApp(data.session.user);
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") leaveApp();
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("suMail").value.trim();
  const phone = document.getElementById("suPhone").value.trim();
  const password = document.getElementById("suPass").value;
  signupMsg.textContent = "";

  if (!email || !password) {
    signupMsg.textContent = "Remplissez au moins email et mot de passe.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { phone } }
  });

  if (error) {
    signupMsg.textContent = error.message;
    return;
  }

  signupForm.reset();
  if (data.session) {
    enterApp(data.user);
  } else {
    const loginRes = await supabaseClient.auth.signInWithPassword({ email, password });
    if (loginRes.data.user) enterApp(loginRes.data.user);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginMail").value.trim();
  const password = document.getElementById("loginPass").value;
  loginMsg.textContent = "";

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginMsg.textContent = "Email ou mot de passe incorrect.";
    return;
  }

  loginForm.reset();
  enterApp(data.user);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

document.getElementById("publishBtn").addEventListener("click", async () => {
  const titleEl = document.getElementById("postTitle");
  const bodyEl = document.getElementById("postBody");
  const title = titleEl.value.trim();
  const content = bodyEl.value.trim();
  if (!title || !content) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { error } = await supabaseClient.from("entries").insert({
    title,
    content,
    user_id: user.id
  });

  if (error) {
    alert("Erreur à l'enregistrement : " + error.message);
    return;
  }

  titleEl.value = "";
  bodyEl.value = "";
  await loadEntries();
});
