/* Test des endpoints Bulletins / Rapports. */
const BASE = 'http://localhost:4000/api/v1';
async function req(path, token, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
const login = (u) => req('/auth/login', null, 'POST', { nomUtilisateur: u, motDePasse: 'ChangeMe123!' });
const token = (await login('admin')).accessToken;
console.log('1. Login admin OK');

const semestres = await req('/notes/reports/semestres', token);
console.log(`2. Semestres: ${semestres.map((s) => s.libelle).join(', ')}`);
const sem = semestres[0];

const board = await req(`/notes/reports/semestre/${sem.id}`, token);
console.log(`3. Classement (${board.semestre.libelle} / ${board.semestre.annee}): ${board.bulletins.length} bulletins`);
for (const b of board.bulletins) {
  console.log(`   rang=${b.rang} | ${b.matricule} ${b.nom} | ${b.totalObtenu}/${b.totalMaximum} | ${b.pourcentage}% | ${b.decision}`);
}
if (board.bulletins.length > 0) {
  const d = await req(`/notes/reports/inscription/${board.bulletins[0].inscriptionId}/semestre/${sem.id}`, token);
  console.log(`4. Détail bulletin ${d.eleve.nom} ${d.eleve.prenom} (${d.eleve.classe})`);
  for (const l of d.lignes) console.log(`   - ${l.matiere} | coef ${l.coefficient} | ${l.note}/20 | ${l.noteBulletin}`);
  console.log(`   TOTAL ${d.totalObtenu}/${d.totalMaximum} = ${d.pourcentage}% · rang ${d.rang} · ${d.decision}`);
}
console.log('RAPPORTS OK');
