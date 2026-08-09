document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Vanta.js 3D Background on the Hero section
    // We use the FOG effect for a premium, moody aesthetic
    if (typeof VANTA !== 'undefined') {
        VANTA.FOG({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            highlightColor: 0xc9a265, // Accent gold
            midtoneColor: 0x0,
            lowlightColor: 0x111111,
            baseColor: 0x050505,
            blurFactor: 0.60,
            speed: 1.50,
            zoom: 1.20
        });
    }

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
