document.addEventListener('DOMContentLoaded', function() {
    const defaultAdmin = {
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
    };

    let users = JSON.parse(localStorage.getItem('users')) || [];
    const adminExists = users.some(user => user.email === defaultAdmin.email && user.role === 'admin');

    if (!adminExists) {
        users.push(defaultAdmin);
        localStorage.setItem('users', JSON.stringify(users));
    }

    const wrapper = document.querySelector('.wrapper');
    const btnPopup = document.querySelector('.btnLogin-popup');
    const iconClose = document.querySelector('.icon-close');

    btnPopup.addEventListener('click', () => {
        wrapper.classList.add('active-popup');
    });

    iconClose.addEventListener('click', () => {
        wrapper.classList.remove('active-popup');
    });

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('userRole', user.role);
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'Mainpage.html';
            }
        } else {
            alert('Invalid login credentials');
        }
    });
});
