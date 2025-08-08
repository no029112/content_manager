document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const themeLabel = document.querySelector('label[for="theme-toggle"]');

    // Function to apply the saved theme
    const applyTheme = (theme) => {
        if (theme === 'light') {
            body.classList.add('light-theme');
            themeToggle.checked = true;
            themeLabel.textContent = 'Light';
        } else {
            body.classList.remove('light-theme');
            themeToggle.checked = false;
            themeLabel.textContent = 'Dark';
        }
    };

    // Check for a saved theme in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    // Event listener for the toggle switch
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            localStorage.setItem('theme', 'light');
            applyTheme('light');
        } else {
            localStorage.setItem('theme', 'dark');
            applyTheme('dark');
        }
    });
});
