# Kotaschool API

## Démarrage

1. Copiez `.env.example` vers `.env` et remplacez `JWT_SECRET` pour un environnement hors développement.
2. Lancez `docker compose up --build`.
3. Dans un second terminal : `docker compose exec api npx prisma migrate dev --name initial` puis `docker compose exec api npm run prisma:seed`.

`compose.yml` possède des valeurs de développement afin de pouvoir démarrer sans fichier `.env`; ne les utilisez pas en production.

L'API est disponible sur `http://localhost:4000/api/v1`; l'état de santé est sur `/api/v1/health`.
Le compte initial est `admin` / `ChangeMe123!` : modifiez immédiatement ce mot de passe hors environnement de développement.
