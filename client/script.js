// Flight Agency Dashboard JavaScript

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const notificationFilters = document.querySelectorAll('.filter-btn');
const notificationItems = document.querySelectorAll('.notification-item');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeNavigation();
    initializeNotifications();
    convertTimeFormats();
    initializeAnimations();
    initializeInteractions();
});

// Navigation functionality
function initializeNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const targetPage = this.getAttribute('data-page');
            switchPage(targetPage);

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function switchPage(pageId) {
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });
}

// Notifications functionality
function initializeNotifications() {
    // Filter notifications
    notificationFilters.forEach(filter => {
        filter.addEventListener('click', function () {
            const filterType = this.getAttribute('data-filter');
            filterNotifications(filterType);

            // Update active filter
            notificationFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Mark notifications as read
    notificationItems.forEach(item => {
        item.addEventListener('click', function () {
            if (this.classList.contains('unread')) {
                this.classList.remove('unread');
                updateNotificationBadge();
            }
        });
    });
}

function filterNotifications(type) {
    notificationItems.forEach(item => {
        if (type === 'all') {
            item.style.display = 'flex';
        } else {
            const itemType = item.getAttribute('data-type');
            item.style.display = itemType === type ? 'flex' : 'none';
        }
    });
}

function updateNotificationBadge() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.querySelector('.notification-badge');

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Time conversion functionality
function convertTimeFormats() {
    const timeElements = document.querySelectorAll('.time[data-time]');

    timeElements.forEach(element => {
        const militaryTime = element.getAttribute('data-time');
        const convertedTime = convertTo12Hour(militaryTime);
        const timePeriod = getTimePeriod(militaryTime);

        element.textContent = convertedTime;

        // Update time period element
        const periodElement = element.nextElementSibling;
        if (periodElement && periodElement.classList.contains('time-period')) {
            periodElement.textContent = timePeriod;
        }
    });
}

function convertTo12Hour(militaryTime) {
    const [hours, minutes] = militaryTime.split(':');
    let hour = parseInt(hours);
    const minute = minutes;
    let period = 'AM';

    if (hour >= 12) {
        period = 'PM';
        if (hour > 12) {
            hour -= 12;
        }
    } else if (hour === 0) {
        hour = 12;
    }

    return `${hour}:${minute} ${period}`;
}

function getTimePeriod(militaryTime) {
    const hour = parseInt(militaryTime.split(':')[0]);

    if (hour >= 5 && hour < 12) {
        return 'Morning';
    } else if (hour >= 12 && hour < 17) {
        return 'Afternoon';
    } else if (hour >= 17 && hour < 21) {
        return 'Evening';
    } else {
        return 'Night';
    }
}

// Animation functionality
function initializeAnimations() {
    // Animate flight cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);

    // Observe flight cards
    document.querySelectorAll('.flight-card').forEach(card => {
        observer.observe(card);
    });

    // Observe notification items
    document.querySelectorAll('.notification-item').forEach(item => {
        observer.observe(item);
    });
}

// Interactive functionality
function initializeInteractions() {
    // Flight card interactions
    document.querySelectorAll('.flight-card').forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });

        card.addEventListener('click', function () {
            // Could open flight details modal
            console.log('Flight card clicked');
        });
    });

    // Button interactions
    document.querySelectorAll('.btn-secondary, .btn-small, .btn-edit').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();

            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Document card interactions
    document.querySelectorAll('.document-card').forEach(card => {
        card.addEventListener('click', function () {
            // Could show document details
            console.log('Document card clicked');
        });
    });
}

// Utility functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search functionality (for future implementation)
// eslint-disable-next-line no-unused-vars
function initializeSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search flights...';
    searchInput.className = 'search-input';

    // Add search input to header if needed
    // document.querySelector('.nav-brand').appendChild(searchInput);

    searchInput.addEventListener('input', debounce(function (e) {
        const searchTerm = e.target.value.toLowerCase();
        filterFlights(searchTerm);
    }, 300));
}

function filterFlights(searchTerm) {
    const flightCards = document.querySelectorAll('.flight-card');

    flightCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Weather functionality (mock data)
function updateWeatherData() {
    const weatherData = {
        'London': { temp: 18, condition: 'Partly Cloudy', icon: 'fa-cloud-sun' },
        'Dubai': { temp: 28, condition: 'Sunny', icon: 'fa-sun' },
        'Lagos': { temp: 32, condition: 'Cloudy', icon: 'fa-cloud' },
        'New York': { temp: 15, condition: 'Rainy', icon: 'fa-cloud-rain' }
    };

    document.querySelectorAll('.flight-weather').forEach(weatherElement => {
        const destination = weatherElement.querySelector('.weather-destination').textContent.replace(' Weather', '');
        const weather = weatherData[destination];

        if (weather) {
            const tempElement = weatherElement.querySelector('.temperature');
            const descElement = weatherElement.querySelector('.weather-desc');
            const iconElement = weatherElement.querySelector('.weather-info i');

            tempElement.textContent = `${weather.temp}°C`;
            descElement.textContent = weather.condition;
            iconElement.className = `fas ${weather.icon}`;
        }
    });
}

// Flight status updates (mock functionality)
// eslint-disable-next-line no-unused-vars
function simulateFlightUpdates() {
    setInterval(() => {
        const statusBadges = document.querySelectorAll('.status-badge');
        const randomBadge = statusBadges[Math.floor(Math.random() * statusBadges.length)];

        // Randomly update flight status
        const statuses = ['On Time', 'Updated', 'Delayed', 'Boarding'];
        const currentStatus = randomBadge.textContent;
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];

        if (currentStatus !== newStatus) {
            randomBadge.textContent = newStatus;
            randomBadge.className = `status-badge ${newStatus.toLowerCase().replace(' ', '-')}`;

            // Show notification for status change
            showStatusUpdateNotification(newStatus);
        }
    }, 30000); // Update every 30 seconds
}

function showStatusUpdateNotification(status) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'status-update-notification';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>Flight status updated: ${status}</span>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize additional features
updateWeatherData();
// simulateFlightUpdates(); // Uncomment to enable status updates

// Add CSS animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .status-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--sky-blue);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .search-input {
        padding: 8px 16px;
        border: 1px solid var(--medium-gray);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        transition: all var(--transition-fast);
        margin-left: var(--spacing-md);
    }
    
    .search-input:focus {
        outline: none;
        border-color: var(--sky-blue);
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
    }
    
    .status-badge.delayed {
        background: #fff1f0;
        color: var(--error-red);
    }
    
    .status-badge.boarding {
        background: #f6ffed;
        color: var(--success-green);
    }
`;

document.head.appendChild(style);

// Export functions for potential use in other modules
window.FlightAgency = {
    switchPage,
    filterNotifications,
    convertTo12Hour,
    formatDate,
    formatCurrency,
    updateWeatherData
};
