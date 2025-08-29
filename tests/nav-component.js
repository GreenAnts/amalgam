// Navigation Component for Amalgam Test Suite
// This component provides consistent navigation across all test pages

class TestNavigation {
    constructor(options = {}) {
        this.options = {
            title: '🧪 Amalgam Test Suite',
            showBackToGame: true,
            showBackToHub: true,
            ...options
        };
    }

    // Create navigation HTML
    createNavHTML() {
        const backToHub = this.options.showBackToHub ? 
            `<a href="../unified-test-navigation.html" class="nav-link">🏠 Back to Test Hub</a>` : '';
        
        const backToGame = this.options.showBackToGame ? 
            `<a href="../../index.html" class="nav-link">🎮 Back to Game</a>` : '';

        return `
            <div class="nav-bar">
                <div class="nav-content">
                    <div class="nav-left">
                        ${backToHub}
                    </div>
                    <div class="nav-center">
                        <h2>${this.options.title}</h2>
                    </div>
                    <div class="nav-right">
                        ${backToGame}
                    </div>
                </div>
            </div>
        `;
    }

    // Create navigation CSS
    createNavCSS() {
        return `
            /* Navigation Bar Styles */
            .nav-bar {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                padding: 15px 0;
                border-bottom: 1px solid #e9ecef;
            }

            .nav-content {
                max-width: 1400px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 30px;
            }

            .nav-left, .nav-right {
                flex: 1;
            }

            .nav-center {
                flex: 2;
                text-align: center;
            }

            .nav-center h2 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 300;
            }

            .nav-link {
                color: white;
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
                font-size: 14px;
                font-weight: 500;
            }

            .nav-link:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }

            .nav-right {
                text-align: right;
            }
        `;
    }

    // Inject navigation into page
    inject() {
        // Add CSS
        const style = document.createElement('style');
        style.textContent = this.createNavCSS();
        document.head.appendChild(style);

        // Add navigation HTML
        const navHTML = this.createNavHTML();
        document.body.insertAdjacentHTML('afterbegin', navHTML);
    }

    // Static method for quick injection
    static inject(options = {}) {
        const nav = new TestNavigation(options);
        nav.inject();
    }
}

// Auto-inject if this script is loaded
if (typeof window !== 'undefined') {
    window.TestNavigation = TestNavigation;
}
