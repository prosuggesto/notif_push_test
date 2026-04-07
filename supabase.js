// Supabase Client Configuration
const SUPABASE_URL = 'https://hgqndkfkuitafuzawuxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncW5ka2ZrdWl0YWZ1emF3dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzQ4OTIsImV4cCI6MjA2MzUxMDg5Mn0.Yixc4Pw9w3NDtxx5WTuU1YAtbN5gh60a6WQzGKKOFjY';

// Lightweight Supabase client (no SDK dependency)
const supabase = {
    // --- AUTH ---
    auth: {
        async signUp(email, password) {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || data.error_description || data.message || 'Erreur inscription');
            return data;
        },

        async signIn(email, password) {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || data.error_description || data.message || 'Identifiants incorrects');
            return data;
        },

        async signOut() {
            const token = localStorage.getItem('sb_access_token');
            if (token) {
                await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(() => {});
            }
            localStorage.removeItem('sb_access_token');
            localStorage.removeItem('sb_refresh_token');
        },

        // Store tokens after login/signup
        _saveSession(data) {
            if (data.access_token) {
                localStorage.setItem('sb_access_token', data.access_token);
                localStorage.setItem('sb_refresh_token', data.refresh_token);
            }
        },

        getToken() {
            return localStorage.getItem('sb_access_token');
        }
    },

    // --- DATABASE (PostgREST) ---
    async insert(table, row) {
        const token = this.auth.getToken();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(row)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erreur insertion');
        return Array.isArray(data) ? data[0] : data;
    },

    async select(table, filters = '') {
        const token = this.auth.getToken();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erreur lecture');
        return data;
    },

    async update(table, filters, row) {
        const token = this.auth.getToken();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(row)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erreur mise à jour');
        return Array.isArray(data) ? data[0] : data;
    }
};
