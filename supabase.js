// Supabase Client Configuration
const SUPABASE_URL = 'https://hgqndkfkuitafuzawuxl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncW5ka2ZrdWl0YWZ1emF3dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzQ4OTIsImV4cCI6MjA2MzUxMDg5Mn0.Yixc4Pw9w3NDtxx5WTuU1YAtbN5gh60a6WQzGKKOFjY';

// Lightweight Supabase client (no SDK dependency)
const supabase = {
    // --- AUTH ---
    auth: {
        async signUp(email, password, metadata = {}) {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password, data: metadata })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.msg || data.error_description || data.message || 'Erreur inscription');
            return data;
        },

        // OAuth (Google, etc.)
        signInWithOAuth(provider) {
            const redirectTo = window.location.origin + window.location.pathname;
            window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
        },

        // Handle OAuth callback (tokens in URL hash)
        getSessionFromUrl() {
            const hash = window.location.hash.substring(1);
            if (!hash) return null;
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            if (accessToken) {
                localStorage.setItem('sb_access_token', accessToken);
                localStorage.setItem('sb_refresh_token', refreshToken);
                // Persist expiry (OAuth hash includes expires_at and expires_in)
                const expiresAt = params.get('expires_at');
                const expiresIn = params.get('expires_in');
                if (expiresAt) {
                    localStorage.setItem('sb_expires_at', expiresAt);
                } else if (expiresIn) {
                    localStorage.setItem('sb_expires_at', String(Math.floor(Date.now() / 1000) + Number(expiresIn)));
                }
                // Clean URL
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                return { access_token: accessToken, refresh_token: refreshToken };
            }
            return null;
        },

        // Get current user from token
        async getUser() {
            const token = localStorage.getItem('sb_access_token');
            if (!token) return null;
            const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) return null;
            return await res.json();
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
                // Persist expiry timestamp (seconds since epoch)
                if (data.expires_at) {
                    localStorage.setItem('sb_expires_at', String(data.expires_at));
                } else if (data.expires_in) {
                    localStorage.setItem('sb_expires_at', String(Math.floor(Date.now() / 1000) + Number(data.expires_in)));
                }
            }
        },

        getToken() {
            return localStorage.getItem('sb_access_token');
        },

        // Refresh access token using the stored refresh_token
        async refreshSession() {
            const refreshToken = localStorage.getItem('sb_refresh_token');
            if (!refreshToken) return null;
            try {
                const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });
                if (!res.ok) {
                    // Refresh failed: clear session
                    localStorage.removeItem('sb_access_token');
                    localStorage.removeItem('sb_refresh_token');
                    localStorage.removeItem('sb_expires_at');
                    return null;
                }
                const data = await res.json();
                this._saveSession(data);
                return data.access_token || null;
            } catch (err) {
                console.error('refreshSession error:', err);
                return null;
            }
        },

        // Decode the exp claim from a JWT without verifying the signature
        _decodeJwtExp(token) {
            try {
                const payload = token.split('.')[1];
                // Base64url → base64
                const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
                const json = atob(b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '='));
                const claims = JSON.parse(json);
                return claims.exp ? Number(claims.exp) : 0;
            } catch {
                return 0;
            }
        },

        // Returns a valid access token, refreshing if needed. Null if no session.
        async getValidToken() {
            const token = localStorage.getItem('sb_access_token');
            if (!token) return null;
            let expiresAt = parseInt(localStorage.getItem('sb_expires_at') || '0', 10);
            // Fallback: decode the JWT to read exp if not stored
            if (!expiresAt) {
                expiresAt = this._decodeJwtExp(token);
                if (expiresAt) {
                    localStorage.setItem('sb_expires_at', String(expiresAt));
                }
            }
            const now = Math.floor(Date.now() / 1000);
            // Refresh if expired or expires in less than 60s
            if (!expiresAt || now >= expiresAt - 60) {
                return await this.refreshSession();
            }
            return token;
        }
    },

    // --- DATABASE (PostgREST) ---
    async insert(table, row) {
        const token = await this.auth.getValidToken();
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
        const token = await this.auth.getValidToken();
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
        const token = await this.auth.getValidToken();
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
    },

    // --- RPC (Postgres functions) ---
    async rpc(fn, params = {}) {
        const token = await this.auth.getValidToken();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(params)
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Erreur RPC');
        }
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    },

    async delete(table, filters) {
        const token = await this.auth.getValidToken();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filters}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Erreur suppression');
        }
        return true;
    },

    // --- STORAGE ---
    storage: {
        // Encode each path segment but preserve slashes as folder separators
        _encodePath(path) {
            return String(path).split('/').map(encodeURIComponent).join('/');
        },
        async upload(bucket, path, file) {
            const token = await supabase.auth.getValidToken();
            // No x-upsert header: avoids INSERT ... ON CONFLICT DO UPDATE
            // which forces Postgres to evaluate both INSERT and UPDATE policies
            // simultaneously. Paths are already unique (Date.now() + UUID folder).
            const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${this._encodePath(path)}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || data.error || 'Erreur upload');
            return data;
        },
        getPublicUrl(bucket, path) {
            return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${this._encodePath(path)}`;
        },
        async remove(bucket, paths) {
            const token = await supabase.auth.getValidToken();
            const list = Array.isArray(paths) ? paths : [paths];
            console.log('[storage.remove] bucket:', bucket, 'paths:', list);
            const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ prefixes: list })
            });
            const data = await res.json().catch(() => null);
            console.log('[storage.remove] status:', res.status, 'data:', data);
            if (!res.ok) {
                throw new Error((data && (data.message || data.error)) || 'Erreur suppression storage');
            }
            return data;
        }
    }
};
