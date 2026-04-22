// Global Coastal Tickets Logic

document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    lucide.createIcons();
});

function logout() {
    if (confirm('Do you want to logout?')) {
        localStorage.clear();
        window.location.href = '/';
    }
}

function updateNavigation() {
    const role = localStorage.getItem('userRole');
    const authBtn = document.getElementById('auth-btn');
    const navMyTickets = document.getElementById('nav-my-tickets');
    const navOrganizer = document.getElementById('nav-organizer');
    const navChecker = document.getElementById('nav-checker');

    if (role) {
        if (authBtn) {
            authBtn.innerHTML = `<i data-lucide="user"></i> ${role.toUpperCase()}`;
            authBtn.href = '#';
            authBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm('Do you want to logout?')) {
                    localStorage.clear();
                    window.location.href = '/';
                }
            };
        }

        // Role-based visibility
        if (role === 'organizer') {
            if (navMyTickets) navMyTickets.classList.add('hidden');
            if (navOrganizer) navOrganizer.classList.remove('hidden');
            if (navChecker) navChecker.classList.remove('hidden');
        } else if (role === 'checker') {
            if (navMyTickets) navMyTickets.classList.add('hidden');
            if (navOrganizer) navOrganizer.classList.add('hidden');
            if (navChecker) navChecker.classList.remove('hidden');
        } else {
            // User role
            if (navMyTickets) navMyTickets.classList.remove('hidden');
            if (navOrganizer) navOrganizer.classList.add('hidden');
            if (navChecker) navChecker.classList.add('hidden');
        }
    } else {
        // Not logged in
        if (navMyTickets) navMyTickets.classList.add('hidden');
        if (navOrganizer) navOrganizer.classList.add('hidden');
        if (navChecker) navChecker.classList.add('hidden');
    }

    // Check for zone closure
    const isEconomyClosed = localStorage.getItem('zone_ECONOMY_closed') === 'true';
    const zoneAlert = document.getElementById('zone-alert');
    if (zoneAlert) {
        if (isEconomyClosed) {
            zoneAlert.classList.remove('hidden');
        } else {
            zoneAlert.classList.add('hidden');
        }
    }
}
