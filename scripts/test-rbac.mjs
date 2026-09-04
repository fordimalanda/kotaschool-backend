/* Test RBAC après réduction à 3 rôles (ADMIN / TEACHER / STUDENT). */
const BASE = 'http://localhost:4000/api/v1';
async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
const login = (email, motDePasse) => req('POST', '/auth/login', { body: { email, motDePasse } });

const show = async (label, r) => console.log(`${label} -> ${r.status}`, JSON.stringify(r.json).slice(0, 160));

// 1. ADMIN
const admin = await login('fordimalanda7@gmail.com', 'MALANDA100');
await show('LOGIN admin', admin);
const at = admin.json?.accessToken;
await show('ADMIN /administration/students', await req('GET', '/administration/students', { token: at }));
await show('ADMIN /notes/validations', await req('GET', '/notes/validations', { token: at }));
await show('ADMIN /notes/reports/semestres', await req('GET', '/notes/reports/semestres', { token: at }));

// 2. TEACHER (25 comptes prof)
const prof = await login('jean.kabamba@kotaschool.cd', 'prof');
await show('LOGIN teacher', prof);
const pt = prof.json?.accessToken;
await show('TEACHER /administration/my-assignments', await req('GET', '/administration/my-assignments', { token: pt }));
await show('TEACHER /notes/context', await req('GET', '/notes/context', { token: pt }));
await show('TEACHER /administration/students (doit être 403)', await req('GET', '/administration/students', { token: pt }));
await show('TEACHER /notes/validations (doit être 403)', await req('GET', '/notes/validations', { token: pt }));

// 3. STUDENT (élève KOT-2026-001 : BEYA Gloria)
const eleve = await login('beya.mbombo.gloria@kotaschool.cd', 'student');
await show('LOGIN student', eleve);
const st = eleve.json?.accessToken;
await show('STUDENT /notes/my-grades', await req('GET', '/notes/my-grades', { token: st }));
await show('STUDENT /administration/students (doit être 403)', await req('GET', '/administration/students', { token: st }));

// 4. Rôle inconnu/SECRETARY ne doit plus exister
await show('LOGIN ex-SECRETARY (doit échouer)', await login('secretary@kotaschool.local', 'secretary'));

console.log('TEST RBAC TERMINÉ');
