const socket = io();

//1:USA  2:UK  3:French  4:Russia  5:Poland



document.addEventListener('click', function(e) {
    // 处理提交按钮
    if (e.target && e.target.id === 'sign_in') {
        submit();
    }
    // 处理注销按钮
    if (e.target && e.target.id === 'log_out') {
        log_out();
    }
});

function submit() {
    const player = document.getElementById('username').value;
    const sign_in_div = document.getElementById('sign_in_div');

    // 发送加入事件到服务器
    socket.emit('join', player);

    // 创建主容器
    const select_player = document.createElement("div");
    select_player.id = "select_player_id";
    select_player.className = "presenting";
    select_player.innerHTML = `
        <div class="presenting_with_block">
            <h2>Welcome, <span class="username">${player}</span></h2>
            <h2> You can choose a online player to challenge...
            <h2>Or, you can wait for a challenge...</h2>
            
            <div id="online-players">
                <h3>Online Players:</h3>
                <ul class="player-list"></ul> 
            </div>

        </div>
        <button id="log_out">log out</button>
    `;
    // 替换原有登录界面
    sign_in_div.replaceWith(select_player);

    // 监听服务器发来的在线玩家列表更新
    socket.on('update-users', (users) => {
        const list = select_player.querySelector('.player-list'); // 直接操作动态生成的元素
        list.innerHTML = users
            .filter(u => u !== player) // 过滤自己
            .map(u => `
                <li>
                    ${u}
                    <button class="challenge-btn" data-user="${u}">Challenge</button>
                </li>
            `).join('');
    });

    socket.on('challenge-request', ({ from }) => {
        const accept = confirm(`${from} is challenging you! Accept?`);
        if (accept) {
            socket.emit('challenge-accept', { from, to: player }); // 通知服务器挑战接受
        } else {
            socket.emit('challenge-reject', { from, to: player });
        }
    });

    // 挑战按钮事件委托（绑定到动态生成的父容器）
    select_player.addEventListener('click', (e) => {
        if (e.target.classList.contains('challenge-btn')) {
            const targetUser = e.target.dataset.user;
            socket.emit('challenge', { from: player, to: targetUser });
        }
    });
}

// `

function log_out(){
    socket.emit('disconnect-manually');
    const select_player = document.getElementById('select_player_id')
    const sign_in = document.createElement("div");
    sign_in.id = "sign_in_div";
    sign_in.className = "presenting_with_block"
    sign_in.innerHTML = 
    `<div><table>
            <tr>
                <td class="evaluation">Username:</td>
                <td><input type="text" id="username" name="username"><br></td>
            </tr>
        </table>
        <button id="sign_in">submit</button>
                
    </div>
    `
    ;
    select_player.replaceWith(sign_in);
    document.getElementById('sign_in').addEventListener('click', submit);
}
