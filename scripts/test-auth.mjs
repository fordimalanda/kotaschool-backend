/* Test de la connexion par e-mail + rôles + endpoint élève. */
const BASE = 'http://localhost:4000/api/v1';
async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
const login = async (email, motDePasse) => post('/auth/login', { email, motDePasse });

// 1. Connexion par e-mail pour chaque rôle
for (const [email, password] of [
  ['admin@kotaschool.local', 'ChangeMe123!'],
  ['prof@kotaschool.local', 'ChangeMe123!'],
  ['aline.banza@kotaschool.local', 'student'],
]) {
  const r = await login(email, password);
  console.log(`LOGIN ${email} -> ${r.status}`, r.json.user ? `role=${r.json.user.role} user="${r.json.user.username}" teacher=${!!r.json.user.teacher} eleve=${!!r.json.user.eleve}` : JSON.stringify(r.json));
  if (email.startsWith('aline')) {
    const g = await get('/notes/my-grades', r.json.accessToken);
    console.log(`MY-GRADES -> ${g.status}`, g.json.eleve ? `${g.json.eleve.nom} ${g.json.eleve.prenom} · ${g.json.classe}` : JSON.stringify(g.json));
    console.log('  semestres:', g.json.semestres?.map((s) => `${s.libelle}: ${s.resultats.length} notes, bulletin=${s.bulletin ? s.bulletin.pourcentage + '%' : 'non-disponible'}`).join(' | '));
  }
}

// 2. L'admin crée un enseignant avec e-mail et SANS mot de passe → défaut 'prof'
const admin = await login('admin@kotaschool.local', 'ChangeMe123!');
const t = await post('/administration/teachers', { nom: 'Kazadi', prenom: 'Serge', sexe: 'M', email: 'serge.kazadi@example.com', motDePasse: '' }, admin.json.accessToken);
console.log(`CREATE TEACHER -> ${t.status}`);
const tLogin = await login('serge.kazadi@example.com', 'prof');
console.log(`LOGIN nouveau prof (mdp defaut 'prof') -> ${tLogin.status}`, tLogin.json.user ? `role=${tLogin.json.user.role} user="${tLogin.json.user.username}"` : JSON.stringify(tLogin.json));

// 3. L'admin crée un autre admin sans mot de passe → défaut 'admin'
const a = await post('/administration/admins', { email: 'admin2@kotaschool.local', motDePasse: '' }, admin.json.accessToken);
console.log(`CREATE ADMIN -> ${a.status}`);
const aLogin = await login('admin2@kotaschool.local', 'admin');
console.log(`LOGIN admin2 (mdp defaut 'admin') -> ${aLogin.status}`, aLogin.json.user ? `role=${aLogin.json.user.role}` : JSON.stringify(aLogin.json));
console.log('TEST AUTH TERMINÉ');
