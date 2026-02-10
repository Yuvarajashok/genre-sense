/* =====================================================
   CONFIG
===================================================== */
const API_BASE = window.location.origin; // Dynamic same-origin

/* =====================================================
   AUTH STATE HANDLER
===================================================== */
const User = {
    login: (userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
        window.location.href = "/page/dashboard";
    },

    logout: () => {
        localStorage.removeItem("user");
        window.location.href = "/";
    },

    get: () => {
        try {
            const u = localStorage.getItem("user");
            return u ? JSON.parse(u) : null;
        } catch (e) {
            localStorage.removeItem("user");
            return null;
        }
    },

    requireAuth: () => {
        const user = User.get();
        if (!user) {
            window.location.href = "/";
            return false;
        }
        return true;
    }
};

/* =====================================================
   API HELPER (CENTRALIZED & SAFE)
===================================================== */
const api = {
    post: async (endpoint, data) => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error("Invalid server response");
        }

        if (!response.ok) {
            throw new Error(result.detail || "Request failed");
        }

        return result;
    },

    upload: async (endpoint, formData) => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            body: formData
        });

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error("Invalid server response");
        }

        if (!response.ok) {
            throw new Error(result.detail || "Upload failed");
        }

        return result;
    },

    get: async (endpoint) => {
        const response = await fetch(`${API_BASE}${endpoint}`);

        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error("Invalid server response");
        }

        if (!response.ok) {
            throw new Error(result.detail || "Request failed");
        }

        return result;
    }
};

/* =====================================================
   GLOBAL UI INIT
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const user = User.get();
    if (!user) return;

    // Update username wherever applicable
    const nameEl = document.getElementById("user-name-display");
    if (nameEl) {
        nameEl.textContent = user.username;
    }
});
