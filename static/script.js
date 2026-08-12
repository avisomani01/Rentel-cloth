document.addEventListener('DOMContentLoaded', () => {
    
    let vantaEffect = null;
    
    // 1. Function to initialize or update Vanta.js 3D Background (Stubbed to support clean static luxury editorial background)
    function updateVantaFog(theme) {
        if (vantaEffect) {
            vantaEffect.destroy();
            vantaEffect = null;
        }
    }

    // 2. Initialize Theme and Event Listeners
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateVantaFog(savedTheme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    
    function updateToggleBtnIcons(theme) {
        toggleBtns.forEach(btn => {
            btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        });
    }

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateVantaFog(newTheme);
            updateToggleBtnIcons(newTheme);
        });
    });

    updateToggleBtnIcons(savedTheme);

    // 2. Initialize Atropos.js for Deep 3D Cards
    document.querySelectorAll('.my-atropos').forEach((el) => {
        Atropos({
            el: el,
            activeOffset: 40,
            shadowScale: 1.05,
            highlight: true,
            rotateXMax: 15,
            rotateYMax: 15,
            stretchZ: 10 // Stretches the Z offset for deeper 3D feeling
        });
    });

    // 3. Scroll Animations using IntersectionObserver
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe fade-in elements
    document.querySelectorAll('.fade-in').forEach((el) => {
        observer.observe(el);
    });

    // Observe stagger elements with delay
    const staggerContainers = document.querySelectorAll('.steps-container, .cards-container, .testimonial-grid');
    staggerContainers.forEach(container => {
        const staggerItems = container.querySelectorAll('.stagger-in');
        
        const containerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    staggerItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('visible');
                        }, index * 150); // 150ms delay between each item
                    });
                    containerObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        containerObserver.observe(container);
    });

    // 4. Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
