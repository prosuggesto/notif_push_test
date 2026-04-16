# CLAUDE.md — Workflow pour ce repo

Ce fichier est lu automatiquement par Claude à chaque session. Les règles
ci-dessous sont prioritaires et doivent être appliquées sans demander à
chaque fois.

## Contexte projet

- **Projet** : Suggesto — plateforme de gestion de leads pour boîtes de nuit
- **Type** : site statique (HTML/CSS/JS vanilla) + Supabase + OneSignal
- **Hébergement** : Vercel
- **Langue des échanges** : français

## Branche de développement

- Toujours développer sur `claude/fix-calendar-template-popup-JZZV2`.
- Ne jamais push direct sur `main` — tout passe par PR.
- Exception : uniquement si l'utilisateur demande explicitement un push
  direct sur main (ex: synchronisation manuelle).

## Workflow PR auto-merge (OBLIGATOIRE)

À chaque changement de code, appliquer cette séquence **sans demander** :

1. Commit sur la branche `claude/fix-calendar-template-popup-JZZV2`
2. `git push -u origin claude/fix-calendar-template-popup-JZZV2`
3. Si aucune PR n'est ouverte pour cette branche → en créer une via
   `mcp__github__create_pull_request` (base=`main`, head=branche feature)
4. S'abonner à l'activité de la PR via `mcp__github__subscribe_pr_activity`
5. Activer l'auto-merge via `mcp__github__enable_pr_auto_merge`
6. Attendre les événements webhook CI :
   - **Vert ✅** → GitHub merge automatiquement dans main, rien à faire
   - **Rouge ❌** → investiguer, corriger, repush sur la même branche
     (la PR se met à jour, le CI relance, auto-merge si vert)

Si une PR est déjà ouverte pour la branche, ne pas en créer une
nouvelle — le nouveau push se rattache automatiquement à la PR
existante.

## CI sur ce repo

Le seul CI actif est **Vercel** (3 checks : deployment principal,
deployment alternatif, Preview Comments). Pas de GitHub Actions, pas
de tests automatisés. Le CI valide uniquement que Vercel déploie
sans erreur — il ne détecte PAS les bugs fonctionnels ni les
régressions UI.

Conséquence : tester manuellement dans le navigateur reste nécessaire
pour valider une feature. Ne pas claim "c'est fini" juste parce que
le CI est vert.

## Rollback

Si un merge dans main pose problème :

- Utiliser `git revert <sha>` (jamais `git reset --hard` sur main,
  jamais `git push --force` sur main).
- Demander confirmation à l'utilisateur avant le revert — c'est
  visible publiquement sur GitHub.

## Gestion des caches iOS Safari

iOS Safari cache agressivement HTML et JS. Quand on modifie `app.js` :

- Les `<script src="app.js?v=XXX">` ont un query param de cache-bust
  à incrémenter à chaque modification significative.
- `vercel.json` applique déjà `Cache-Control: no-cache, no-store,
  must-revalidate` sur toutes les routes — ne pas modifier cette
  règle sans raison.
- Les balises `<meta http-equiv="Cache-Control">` dans auth.html et
  entreprise.html renforcent le no-cache côté client.

## Base de données (Supabase)

Tables utilisées :
- `profiles_users` — utilisateurs (fêtards), contient `points`
- `profiles_business` — établissements
- `calendrier` — affluence journalière par boîte (compteurs par genre)
- `dynamicstats` — log d'événements (entrée/sortie/bar)

Champs genre dans `calendrier` : mappés via `getGenderField(sexe)`.

**Note UX** : l'éditeur Supabase trie par UUID alphabétiquement par
défaut, pas par `created_at`. Les nouvelles lignes n'apparaissent
donc PAS forcément en bas — ce n'est pas un bug de code. Pour voir
l'ordre chronologique, trier explicitement par `created_at DESC`
dans l'UI Supabase.

## Intégrations externes

- **OneSignal v16** : utiliser `OneSignal.Slidedown.promptPush({force:true})`
  (attention aux majuscules — c'est `Slidedown` pas `slidedown`).
- **Supabase** : auth via `supabase.auth.signIn(email, password)` +
  fetch profile séparé. Ne pas utiliser de webhook n8n.

## Ton

- Répondre en français.
- Être concis, pas de paraphrase excessive.
- Pas d'emojis sauf si l'utilisateur en utilise.
