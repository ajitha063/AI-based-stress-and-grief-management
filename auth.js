// auth.js — Login & Registration

function toggleAuth(mode) {
  document.getElementById('loginCard').classList.toggle('hidden', mode !== 'login');
  document.getElementById('registerCard').classList.toggle('hidden', mode !== 'register');
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');

  if (!email || !password) {
    showError(err, 'Please fill in all fields.');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === btoa(password));

  if (!user) {
    showError(err, 'Invalid email or password.');
    return;
  }

  sessionStorage.setItem('serenity_user', JSON.stringify({ id: user.id, name: user.name, email: user.email }));
  window.location.href = 'pages/dashboard.html';
}

function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const err = document.getElementById('registerError');

  if (!name || !email || !password) {
    showError(err, 'Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    showError(err, 'Password must be at least 6 characters.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showError(err, 'An account with this email already exists.');
    return;
  }

  const newUser = {
    id: 'u_' + Date.now(),
    name,
    email,
    password: btoa(password),
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  localStorage.setItem('serenity_users', JSON.stringify(users));

  sessionStorage.setItem('serenity_user', JSON.stringify({ id: newUser.id, name, email }));
  window.location.href = 'pages/dashboard.html';
}

function getUsers() {
  return JSON.parse(localStorage.getItem('serenity_users') || '[]');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// If already logged in, skip to dashboard
if (sessionStorage.getItem('serenity_user')) {
  window.location.href = 'pages/dashboard.html';
}
