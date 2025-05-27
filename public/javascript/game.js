const socket = io();
let currentPlayer = null;

// 初始化绑定
document.getElementById('sign_in').addEventListener('click', handleSubmit);

function handleSubmit() {
  const input = document.getElementById('username');
  const invalidationMessage = document.getElementById('invalidation_input');
  if (!input || !invalidationMessage) {
    console.error('Input or invalidation_input element not found');
    return;
  }

  const username = input.value.trim();
  if (!username) {
    invalidationMessage.innerHTML = 'Please enter a valid username.';
    return;
  }
  invalidationMessage.innerHTML = ''; // Clear error message

  // 清理旧状态
  if (currentPlayer) {
    socket.off('update_users');
    socket.off('challenge_request');
  }

  currentPlayer = username;
  socket.emit('join', username);

  // 构建主界面，只修改 sign_in_div
  const signInDiv = document.getElementById('sign_in_div');
  if (!signInDiv) {
    console.error('sign_in_div element not found');
    return;
  }
  signInDiv.innerHTML = `
    <div class="main-panel">
      <h2>Welcome <span class="username">${username}</span></h2>
      <div class="online-list">
        <h3>Online Players:</h3>
        <ul id="player_list"></ul>
      </div>
      <button id="log_out" class="btn-danger">Logout</button>
    </div>
  `;

  // 绑定新事件
  document.getElementById('log_out').addEventListener('click', handleLogout);
  setupEventListeners();
}

function setupEventListeners() {
  // 玩家列表更新
  socket.on('update_users', users => {
    console.log('[CLIENT] Received users:', users);
    const list = document.getElementById('player_list');
    if (!list) return;

    list.innerHTML = users
      .filter(u => u !== currentPlayer)
      .map(u => `
        <li class="player-item">
          <span>${u}</span>
          <button 
            class="btn-challenge" 
            data-user="${u}"
            aria-label="Challenge ${u}"
          >
            Challenge
          </button>
        </li>
      `).join('');

    // 动态绑定挑战按钮
    document.querySelectorAll('.btn-challenge').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.user;
        socket.emit('challenge', {
          from: currentPlayer,
          to: target
        });
      });
    });
  });

  // 挑战请求处理
  socket.on('challenge_request', ({ from }) => {
    if (confirm(`${from} 向你发起挑战！接受吗？`)) {
      socket.emit('challenge_accept', {
        from: from,
        to: currentPlayer
      });
    }
  });

  // 游戏开始处理
  socket.on('game_start', ({ room_id }) => {
    console.log(`[CLIENT] Game started in room: ${room_id}`);
    // 这里可以添加游戏界面的代码
  });

  // 错误处理
  socket.on('error', ({ message }) => {
    alert(`Error: ${message}`);
    // 恢复登录界面
    handleLogout();
  });
}

function handleLogout() {
  // 清理操作
  socket.emit('disconnect_manually');
  socket.off('update_users');
  socket.off('challenge_request');
  
  currentPlayer = null;

  // 恢复登录界面，只修改 sign_in_div
  const signInDiv = document.getElementById('sign_in_div');
  if (!signInDiv) {
    console.error('sign_in_div element not found');
    return;
  }
  signInDiv.innerHTML = `
    <h1>Please enter your name to start the game.</h1>
    <div>
      <table>
        <tr>
          <td class="evaluation">Username:</td>
          <td><input type="text" id="username" autofocus></td>
          <td id="invalidation_input" style="color: red;"></td>
        </tr>
      </table>
      <button id="sign_in" class="btn-primary">Submit</button>
    </div>
  `;

  // 重新绑定
  document.getElementById('sign_in').addEventListener('click', handleSubmit);
}