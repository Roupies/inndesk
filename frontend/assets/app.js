(function () {
    "use strict";

    const API_BASE_URL = "/api/v1";
    const TOKEN_STORAGE_KEY = "inndesk_token";
    const USER_STORAGE_KEY = "inndesk_user";
    const THEME_STORAGE_KEY = "theme";
    const LOGIN_PATH = "/app/index.html";
    const DASHBOARD_PATH = "/app/dashboard.html";

    const STATUS_LABELS = {
        admin: "Administrateur",
        receptionist: "Réceptionniste",
        confirmed: "Confirmée",
        checked_in: "En séjour",
        checked_out: "Terminée",
        cancelled: "Annulée",
        no_show: "Non-présentée",
        available: "Disponible",
        occupied: "Occupée",
        dirty: "À nettoyer",
        cleaning: "En nettoyage",
        maintenance: "Maintenance",
        pending: "En attente",
        paid: "Payée"
    };

    const STATUS_VARIANTS = {
        confirmed: "blue",
        checked_in: "green",
        checked_out: "gray",
        cancelled: "red",
        no_show: "amber",
        available: "green",
        occupied: "blue",
        dirty: "amber",
        cleaning: "blue",
        maintenance: "red",
        pending: "amber",
        paid: "green"
    };

    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            console.warn("InnDesk: localStorage is unavailable.", error);
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            console.warn("InnDesk: unable to persist a local preference.", error);
        }
    }

    function removeStorage(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            console.warn("InnDesk: unable to clear local data.", error);
        }
    }

    function getToken() {
        return readStorage(TOKEN_STORAGE_KEY);
    }

    function setToken(token) {
        if (typeof token === "string" && token.trim()) {
            writeStorage(TOKEN_STORAGE_KEY, token);
        } else {
            removeStorage(TOKEN_STORAGE_KEY);
        }
    }

    function getCurrentUser() {
        const serializedUser = readStorage(USER_STORAGE_KEY);
        if (!serializedUser) return null;

        try {
            return JSON.parse(serializedUser);
        } catch (error) {
            removeStorage(USER_STORAGE_KEY);
            console.warn("InnDesk: invalid cached user data was discarded.", error);
            return null;
        }
    }

    function setCurrentUser(user) {
        if (user && typeof user === "object") {
            writeStorage(USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            removeStorage(USER_STORAGE_KEY);
        }
    }

    function clearToken() {
        removeStorage(TOKEN_STORAGE_KEY);
        removeStorage(USER_STORAGE_KEY);
    }

    function isLoginPage() {
        const path = window.location.pathname.replace(/\/+$/, "");
        return path === "/app" || path === "/app/index.html";
    }

    function redirectIfNotAuth() {
        if (getToken()) return false;

        if (!isLoginPage()) {
            window.location.replace(LOGIN_PATH);
            return true;
        }

        return false;
    }

    function redirectIfAuth() {
        if (!getToken() || !isLoginPage()) return false;
        window.location.replace(DASHBOARD_PATH);
        return true;
    }

    function normalizeErrorDetail(data, response) {
        if (data && typeof data.detail === "string") return data.detail;
        if (data && Array.isArray(data.detail)) {
            return data.detail.map(function (item) {
                return item && item.msg ? item.msg : String(item);
            }).join(", ");
        }
        if (typeof data === "string" && data.trim()) return data;
        return "Erreur HTTP " + response.status;
    }

    // Shared authenticated JSON client used by all page-specific API files.
    async function apiFetch(path, options) {
        const requestOptions = Object.assign({}, options || {});
        const headers = new Headers(requestOptions.headers || {});
        const token = getToken();

        headers.set("Accept", "application/json");
        if (requestOptions.body && !(requestOptions.body instanceof FormData) && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        if (token && !headers.has("Authorization")) {
            headers.set("Authorization", "Bearer " + token);
        }

        requestOptions.headers = headers;

        const requestPath = String(path || "");
        const url = requestPath.indexOf(API_BASE_URL + "/") === 0
            ? requestPath
            : API_BASE_URL + (requestPath.charAt(0) === "/" ? requestPath : "/" + requestPath);
        const response = await window.fetch(url, requestOptions);
        const contentType = response.headers.get("content-type") || "";
        let data = null;

        if (response.status !== 204) {
            data = contentType.indexOf("application/json") !== -1
                ? await response.json().catch(function () { return null; })
                : await response.text().catch(function () { return ""; });
        }

        if (!response.ok) {
            const detail = normalizeErrorDetail(data, response);
            const error = new Error(detail);
            error.status = response.status;
            error.detail = detail;

            if (response.status === 401 && requestPath.indexOf("/auth/login") === -1) {
                clearToken();
                if (!isLoginPage()) window.location.replace(LOGIN_PATH);
            }

            throw error;
        }

        return data;
    }

    async function ensureCurrentUser() {
        if (!getToken()) return null;

        const cachedUser = getCurrentUser();
        if (cachedUser) return cachedUser;

        const user = await apiFetch("/users/me");
        setCurrentUser(user);
        return user;
    }

    function toValidDate(value) {
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = toValidDate(value);
        return date ? date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }) : "—";
    }

    function formatShortDate(value) {
        const date = toValidDate(value);
        return date ? date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit"
        }) : "—";
    }

    function formatDateTime(value) {
        const date = toValidDate(value);
        return date ? date.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }) : "—";
    }

    function formatCurrency(value) {
        const amount = Number(value);
        return Number.isFinite(amount)
            ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
            : "—";
    }

    function statusLabel(status) {
        if (status === null || status === undefined || status === "") return "—";
        return STATUS_LABELS[status] || String(status).replace(/_/g, " ");
    }

    function createStatusBadge(status) {
        const badge = document.createElement("span");
        const variant = STATUS_VARIANTS[status] || "gray";
        badge.className = "badge badge-" + variant;
        badge.textContent = statusLabel(status);
        return badge;
    }

    function isToday(value) {
        const date = toValidDate(value);
        if (!date) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear()
            && date.getMonth() === today.getMonth()
            && date.getDate() === today.getDate();
    }

    function getStoredTheme() {
        const theme = readStorage(THEME_STORAGE_KEY);
        if (theme === "dark" || theme === "light") return theme;
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    function applyTheme(theme) {
        const selectedTheme = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", selectedTheme);

        const lightIcon = document.getElementById("themeIconLight");
        const darkIcon = document.getElementById("themeIconDark");
        if (lightIcon) lightIcon.style.display = selectedTheme === "dark" ? "block" : "none";
        if (darkIcon) darkIcon.style.display = selectedTheme === "dark" ? "none" : "block";

        return selectedTheme;
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme") || getStoredTheme();
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        writeStorage(THEME_STORAGE_KEY, nextTheme);
        return applyTheme(nextTheme);
    }

    function showSkeleton(element) {
        if (!element) return;
        element.classList.add("skeleton");
        element.setAttribute("aria-busy", "true");
    }

    function showError(element, message) {
        if (!element) return;
        clearElement(element);
        element.classList.remove("skeleton");
        element.removeAttribute("aria-busy");
        const errorMessage = document.createElement("p");
        errorMessage.className = "error-message";
        errorMessage.textContent = message || "Impossible de charger les données";
        element.appendChild(errorMessage);
    }

    function createElement(tagName, options) {
        const element = document.createElement(tagName);
        const settings = options || {};

        if (settings.className) element.className = settings.className;
        if (settings.text !== undefined) element.textContent = String(settings.text);
        if (settings.attributes && typeof settings.attributes === "object") {
            Object.keys(settings.attributes).forEach(function (name) {
                element.setAttribute(name, String(settings.attributes[name]));
            });
        }

        return element;
    }

    function clearElement(element) {
        if (!element) return;
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function getFormData(form) {
        if (!form) return {};
        const values = {};
        new FormData(form).forEach(function (value, key) {
            values[key] = value;
        });
        return values;
    }

    function showFieldError(field, message) {
        const input = typeof field === "string" ? document.getElementById(field) : field;
        if (!input || !input.parentNode) return;

        const existingError = input.parentNode.querySelector(".form-error");
        if (existingError) existingError.remove();
        input.classList.add("error");

        const errorMessage = document.createElement("div");
        errorMessage.className = "form-error";
        errorMessage.textContent = message || "Valeur invalide";
        input.parentNode.insertBefore(errorMessage, input.nextSibling);
    }

    function clearFieldErrors(container) {
        const root = container || document;
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll(".form-error").forEach(function (error) { error.remove(); });
        root.querySelectorAll(".form-input.error").forEach(function (input) {
            input.classList.remove("error");
        });
    }

    function validateEmail(value) {
        return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    }

    function validateRequired(value) {
        return value !== null && value !== undefined && String(value).trim() !== "";
    }

    function initializeCommonUi() {
        if (document.documentElement.dataset.appInitialized === "true") return;
        document.documentElement.dataset.appInitialized = "true";
        applyTheme(getStoredTheme());

        if (window.lucide && typeof window.lucide.createIcons === "function") {
            try {
                window.lucide.createIcons();
            } catch (error) {
                console.warn("InnDesk: Lucide icons could not be initialized.", error);
            }
        }

        if (window.matchMedia) {
            const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
            colorScheme.addEventListener("change", function (event) {
                if (!readStorage(THEME_STORAGE_KEY)) applyTheme(event.matches ? "dark" : "light");
            });
        }
    }

    // These names form the legacy classic-script contract consumed by assets/api/*.js.
    Object.assign(window, {
        apiFetch: apiFetch,
        getToken: getToken,
        setToken: setToken,
        clearToken: clearToken,
        getCurrentUser: getCurrentUser,
        setCurrentUser: setCurrentUser,
        ensureCurrentUser: ensureCurrentUser,
        redirectIfNotAuth: redirectIfNotAuth,
        redirectIfAuth: redirectIfAuth,
        formatDate: formatDate,
        formatShortDate: formatShortDate,
        formatDateTime: formatDateTime,
        formatCurrency: formatCurrency,
        statusLabel: statusLabel,
        createStatusBadge: createStatusBadge,
        isToday: isToday,
        toggleTheme: toggleTheme,
        showSkeleton: showSkeleton,
        showError: showError,
        createElement: createElement,
        clearElement: clearElement,
        getFormData: getFormData,
        showFieldError: showFieldError,
        clearFieldErrors: clearFieldErrors,
        validateEmail: validateEmail,
        validateRequired: validateRequired
    });

    // Apply the persisted theme immediately; initialize DOM-dependent UI once.
    applyTheme(getStoredTheme());
    document.addEventListener("DOMContentLoaded", initializeCommonUi, { once: true });
}());
