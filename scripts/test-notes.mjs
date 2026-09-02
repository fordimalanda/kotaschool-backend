/* Test de bout en bout du module Notes (sans couche UI). */
const BASE = 'http://localhost:4000/api/v1';

async function post(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function login(username) {
  return post('/auth/login', null, { nomUtilisateur: username, motDePasse: 'ChangeMe123!' });
}

const profToken = (await login('prof')).accessToken;
const adminToken = (await login('admin')).accessToken;
console.log('1. Login prof + admin OK');

const ctx = await get('/notes/context', profToken);
const aff = ctx.assignments[0];
const sem = ctx.semestres[0];
const periode = sem.periodes[0];
const type = ctx.typesEvaluation.find((t) => t.libelle === 'INTERROGATION');
console.log(`2. Contexte: affectation=${aff.classeMatiere.classe.libelle}/${aff.classeMatiere.matiere.libelle} (${aff.annee.libelle})`);
console.log(`   semestre=${sem.libelle}, période=${periode.libelle}, type=${type.libelle}`);

const evaluation = await post('/notes/evaluations', profToken, {
  libelle: `Interrogation ${periode.libelle} ${aff.classeMatiere.matiere.libelle}`,
  idAffectation: aff.id,
  idSemestre: sem.id,
  idPeriode: periode.id,
  idTypeEvaluation: type.id,
  dateEvaluation: '2026-09-05',
});
console.log(`3. Évaluation créée: ${evaluation.libelle} (${evaluation.id})`);

const grille = await get(`/notes/grille/${evaluation.id}`, profToken);
console.log(`4. Grille: ${grille.rows.length} élèves, max=${grille.evaluation.maximum}`);
const notes = grille.rows.map((r, i) => ({ idInscription: r.idInscription, valeurNote: [16, 14, 18][i] ?? 15, observation: 'OK' }));
await post('/notes/batch', profToken, { idEvaluation: evaluation.id, notes });
console.log('5. Notes enregistrées en brouillon');

const submitted = await post(`/notes/evaluations/${evaluation.id}/soumettre`, profToken);
console.log(`6. Soumise: statut=${submitted.statut}`);

const pending = await get('/notes/validations', adminToken);
console.log(`7. En attente de validation (côté admin): ${pending.length}`);
const validated = await post(`/notes/validations/${evaluation.id}/valider`, adminToken);
console.log(`8. Validée: statut=${validated.statut}`);

const bulletins = await post(`/notes/bulletins/semestre/${sem.id}/calculer`, adminToken);
console.log(`9. Bulletins calculés: ${bulletins.length}`);
for (const b of bulletins) {
  console.log(`   → total=${b.totalObtenu}/${b.totalMaximum}  pct=${b.pourcentage}%  rang=${b.rang}  décision=${b.decision}`);
}

const grilleAfter = await get(`/notes/grille/${evaluation.id}`, adminToken);
const first = grilleAfter.rows[0];
console.log(`10. Vérif. note verrouillée (vue admin): élève=${first.nom} note=${first.valeurNote} estValide=${first.estValide}`);
console.log('FLUX TERMINÉ SANS ERREUR');
