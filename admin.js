document.addEventListener('DOMContentLoaded', () => {
    const addUserBtn = document.querySelector('.btnAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const closeModal = document.querySelector('.modal .close');
    const addUserForm = document.getElementById('addUserForm');
    const userList = document.getElementById('userList');

    addUserBtn.addEventListener('click', () => {
        addUserModal.style.display = 'flex';
    });

    closeModal.addEventListener('click', () => {
        addUserModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === addUserModal) {
            addUserModal.style.display = 'none';
        }
    });

    addUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        users.push({ email, password, role });
        localStorage.setItem('users', JSON.stringify(users));

        alert('Benutzer hinzugefügt');
        addUserModal.style.display = 'none';
        addUserForm.reset();
        displayUsers();
    });

    function deleteUser(index) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        users.splice(index, 1);
        localStorage.setItem('users', JSON.stringify(users));
        displayUsers();
    }

    function displayUsers() {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        userList.innerHTML = '';
        users.forEach((user, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><button class="btnDeleteUser" data-index="${index}">Löschen</button></td>
            `;
            userList.appendChild(row);
        });

        // Fügen Sie Event-Listener für die Lösch-Schaltflächen hinzu
        document.querySelectorAll('.btnDeleteUser').forEach(button => {
            button.addEventListener('click', () => {
                const index = button.getAttribute('data-index');
                deleteUser(index);
            });
        });
    }

    displayUsers();
});
