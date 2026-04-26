// ====================================================
// SEED TEST DATA — Coller dans la console du navigateur
// (sur la page entreprise.html ou auth.html)
// ====================================================

(async function seedTestData() {
    console.log('=== SEED TEST DATA START ===');

    // 1. Fake fêtards (profiles_users)
    const fakeUsers = [
        { id: '11111111-aaaa-bbbb-cccc-000000000001', nom: 'Lucas Martin', age: 24, sexe: 'homme', ville: 'Paris', pays: 'France', points: '0', email: 'lucas.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000002', nom: 'Emma Dubois', age: 22, sexe: 'femme', ville: 'Paris', pays: 'France', points: '0', email: 'emma.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000003', nom: 'Léa Bernard', age: 27, sexe: 'femme', ville: 'Lyon', pays: 'France', points: '0', email: 'lea.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000004', nom: 'Hugo Petit', age: 30, sexe: 'homme', ville: 'Genève', pays: 'Suisse', points: '0', email: 'hugo.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000005', nom: 'Chloé Roux', age: 21, sexe: 'femme', ville: 'Paris', pays: 'France', points: '0', email: 'chloe.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000006', nom: 'Alex Moreau', age: 25, sexe: 'non-binaire', ville: 'Lyon', pays: 'France', points: '0', email: 'alex.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000007', nom: 'Nathan Leroy', age: 28, sexe: 'homme', ville: 'Genève', pays: 'Suisse', points: '0', email: 'nathan.test@fake.com' },
        { id: '11111111-aaaa-bbbb-cccc-000000000008', nom: 'Jade Simon', age: 23, sexe: 'femme', ville: 'Paris', pays: 'France', points: '0', email: 'jade.test@fake.com' },
    ];

    for (const u of fakeUsers) {
        try {
            await supabase.upsert('profiles_users', u, 'id');
            console.log('  User:', u.nom);
        } catch (e) { console.warn('User skip:', u.nom, e.message); }
    }

    // 2. Get existing businesses
    const businesses = await supabase.select('profiles_business');
    console.log('Existing businesses:', businesses.map(b => b.nom_boite));

    // Find Brainrot Code business
    const brainrot = businesses.find(b => b.nom_boite.toLowerCase().includes('brainrot'));
    if (!brainrot) {
        console.error('Brainrot Code not found in profiles_business! Create it first.');
        return;
    }
    console.log('Brainrot Code found:', brainrot.id);

    // 3. All fake users → favoris for Brainrot Code
    for (const u of fakeUsers) {
        try {
            await supabase.upsert('favoris', {
                user_id: u.id,
                boite_id: brainrot.id,
                boite_name: brainrot.nom_boite
            }, 'user_id,boite_id');
            console.log('  Favori:', u.nom, '→', brainrot.nom_boite);
        } catch (e) { console.warn('Favori skip:', u.nom, e.message); }
    }

    // 4. point_user_boite — give each user some points
    const pointsValues = [45, 12, 78, 5, 33, 20, 60, 15];
    for (let i = 0; i < fakeUsers.length; i++) {
        try {
            await supabase.upsert('point_user_boite', {
                user_id: fakeUsers[i].id,
                boite_id: brainrot.id,
                boite_name: brainrot.nom_boite,
                total_point: pointsValues[i]
            }, 'boite_id,user_id');
            console.log('  Points:', fakeUsers[i].nom, '→', pointsValues[i]);
        } catch (e) { console.warn('Points skip:', e.message); }
    }

    // 5. user_boite_monthly_stats — some visit/commande data
    const now = new Date();
    const mois = now.getMonth() + 1;
    const annee = now.getFullYear();
    const visitsData = [8, 3, 12, 1, 5, 7, 2, 4];
    const commandeData = [15, 5, 20, 2, 8, 10, 3, 6];

    for (let i = 0; i < fakeUsers.length; i++) {
        try {
            await supabase.insert('user_boite_monthly_stats', {
                user_id: fakeUsers[i].id,
                boite_id: brainrot.id,
                boite_name: brainrot.nom_boite,
                mois: mois,
                annee: annee,
                visits: visitsData[i],
                total_commande: commandeData[i]
            });
            console.log('  Monthly stats:', fakeUsers[i].nom, '→', visitsData[i], 'visits');
        } catch (e) { console.warn('Monthly skip:', fakeUsers[i].nom, e.message); }
    }

    // 6. Also add some favorites to other businesses (if they exist)
    const otherBiz = businesses.filter(b => b.id !== brainrot.id);
    for (const biz of otherBiz.slice(0, 3)) {
        // First 3 users also like other businesses
        for (let i = 0; i < 3; i++) {
            try {
                await supabase.upsert('favoris', {
                    user_id: fakeUsers[i].id,
                    boite_id: biz.id,
                    boite_name: biz.nom_boite
                }, 'user_id,boite_id');
            } catch (e) {}
        }
    }

    // 7. Calendrier — add a soirée today for Brainrot Code
    const today = new Date().toISOString().split('T')[0];
    try {
        await supabase.upsert('calendrier', {
            boite_id: brainrot.id,
            date_soiree: today,
            nom_template: 'Soirée Test',
            affluence: 125,
            homme: 60,
            femme: 55,
            non_binaire: 10,
            total_commande: 45
        }, 'boite_id,date_soiree');
        console.log('  Calendrier: soirée ajoutée pour aujourd\'hui');
    } catch (e) { console.warn('Calendrier:', e.message); }

    console.log('=== SEED TEST DATA COMPLETE ===');
    console.log(`${fakeUsers.length} users créés, favoris + points + stats insérés pour ${brainrot.nom_boite}`);
})();
