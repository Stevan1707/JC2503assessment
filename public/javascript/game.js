const socket = io();
let current_player = null;
let current_room = null;

document.getElementById('sign_in').addEventListener('click', handleSubmit);

//submit button
function handleSubmit() {
    const input = document.getElementById('username');
    const invalidation_input = document.getElementById('invalidation_input');
    if (!input || !invalidation_input) {
        return;
    }

    const username = input.value.trim();
    if (!username) {
        invalidation_input.innerHTML = 'Please enter a valid username.';
        return;
    }
    invalidation_input.innerHTML = '';

    if (current_player) {
        socket.off('update_users');
        socket.off('challenge_request');
        socket.off('challenge_reject');
        socket.off('game_start');
        socket.off('question');
        socket.off('answer_result');
        socket.off('game_end');
    }

    current_player = username;
    socket.emit('join', username);

    const sign_in_div = document.getElementById('sign_in_div');
    if (!sign_in_div) {
        return;
    }
    //the challenge inner page
    sign_in_div.innerHTML = `
        <div class="main_panel">
            <h2>Welcome <span class="username">${username}</span></h2>
            <div class="online_list">
                <h3>You are online now! If you leave this page, you will be offline</h3>
                <h3>Other online Players:</h3>
                <ul id="player_list"></ul>
            </div>
            <button id="log_out" class="log_out_button">Logout</button>
        </div>
    `;

    document.getElementById('log_out').addEventListener('click', handleLogout);
    setupEventListeners();
}
// add event listerers
function setupEventListeners() {
    socket.on('update_users', ({ users, in_game }) => {
        const list = document.getElementById('player_list');
        if (!list) return;

        list.innerHTML = users
            .filter(user => user !== current_player)
            .map(user => `
                <li class="player_item">
                    <span>${user}</span>
                    ${in_game.includes(user) ? 
                        '<span>Cannot Challenge</span>' : 
                        `<button data-user="${user}" aria-label="Challenge ${user}">Challenge</button>`}
                </li>
            `).join('');

        document.querySelectorAll('button[data-user]').forEach(button => {
            button.addEventListener('click', () => {
                const target = button.dataset.user;
                socket.emit('challenge', { from: current_player, to: target });
            });
        });
    });

    socket.on('challenge_request', ({ from }) => {
        const sign_in_div = document.getElementById('sign_in_div');
        if (!sign_in_div) return;
        // the challenge page
        sign_in_div.innerHTML = `
            <div>
                <h2>${from} challenges you!</h2>
                <button id="accept_challenge" class="primary_button">Accept</button>
                <button id="reject_challenge" class="danger_button">Reject</button>
            </div>
        `;
        //dealing with challenges
        document.getElementById('accept_challenge').addEventListener('click', () => {
            socket.emit('challenge_accept', { from, to: current_player });
        });
        document.getElementById('reject_challenge').addEventListener('click', () => {
            socket.emit('challenge_reject', { from, to: current_player });
            showChallengeScreen();
        });
    });

    socket.on('challenge_reject', ({ from }) => {
        //alert to the player
        alert(`Challenge to ${from} was rejected.`);
        showChallengeScreen();
    });

    // add both player to a room
    socket.on('game_start', ({ room_id, opponent }) => {
        current_room = room_id;
        showQuizScreen(opponent);
    });

    socket.on('question', ({ question, flag, options, player_score, opponent_score }) => {
        const sign_in_div = document.getElementById('sign_in_div');
        if (!sign_in_div) return;
        //challenging page
        sign_in_div.innerHTML = `
            <div>
                <h2 class="center">${question}</h2>
                <img src="../img/flags/${flag}.png" alt="Flag" class="national_flag">
                <div class="options">
                    ${options.map((option, index) => `
                        <button class="answer_button" data-option="${index}">${option}</button>
                    `).join('')}
                </div>
                <div>
                    <p>Your Score: <span id="player_score">${player_score}</span></p>
                    <p>Opponent's Score: <span id="opponent_score">${opponent_score}</span></p>
                </div>
            </div>
        `;

        document.querySelectorAll('.answer_button').forEach(button => {
            button.addEventListener('click', () => {
                const option = parseInt(button.dataset.option);
                socket.emit('answer', { room_id: current_room, option });
                document.querySelectorAll('.answer_button').forEach(b => b.disabled = true);
            });
        });
    });

    socket.on('answer_result', ({ player, player_score, opponent_score }) => {
        const player_score_element = document.getElementById('player_score');
        const opponent_score_element = document.getElementById('opponent_score');

        if (player_score_element && opponent_score_element) {
            player_score_element.textContent = current_player === player ? player_score : opponent_score;
            opponent_score_element.textContent = current_player === player ? opponent_score : player_score;
        }
    });

    socket.on('game_end', ({ player_score, opponent_score, opponent }) => {
        const sign_in_div = document.getElementById('sign_in_div');
        if (!sign_in_div) return;

        let result = 'Draw';
        if (player_score > opponent_score) result = 'You win';
        else if (player_score < opponent_score) result = 'You lose';
        //show the result
        sign_in_div.innerHTML = `
            <div class="result_panel">
                <h2>Game Over</h2>
                <p>${result}!</p>
                <p>Your Score: ${current_player === opponent ? opponent_score : player_score}</p>
                <p>${opponent}'s Score: ${current_player === opponent ? player_score : opponent_score}</p>
                <button id="return_challenge" class="primary_button">Return to Challenge</button>
            </div>
        `;

        document.getElementById('return_challenge').addEventListener('click', () => {
            current_room = null;
            showChallengeScreen();
        });
    });

    socket.on('error', ({ message }) => {
        alert(`Error: ${message}`);
        showChallengeScreen();
    });
}

function showChallengeScreen() {
    const sign_in_div = document.getElementById('sign_in_div');
    if (!sign_in_div) {
        return;
    }
    sign_in_div.innerHTML = `
        <div class="main_panel">
            <h2>Welcome <span class="username">${current_player}</span></h2>
            <div class="online_list">
                <h3>Online Players:</h3>
                <ul id="player_list"></ul>
            </div>
            <button id="log_out" class="log_out_button">Logout</button>
        </div>
    `;
    document.getElementById('log_out').addEventListener('click', handleLogout);
    socket.emit('refresh_users');
}

function showQuizScreen(opponent) {
    const sign_in_div = document.getElementById('sign_in_div');
    if (!sign_in_div) return;

    sign_in_div.innerHTML = `
        <div class="quiz_panel">
            <h2 class="center">Waiting for question...</h2>
            <div class="scoreboard">
                <p>Your Score: <span id="player_score">0</span></p>
                <p>${opponent}'s Score: <span id="opponent_score">0</span></p>
            </div>
        </div>
    `;
}

//handling user logout
function handleLogout() {
    socket.emit('disconnect_manually');
    socket.off('update_users');
    socket.off('challenge_request');
    socket.off('challenge_reject');
    socket.off('game_start');
    socket.off('question');
    socket.off('answer_result');
    socket.off('game_end');
    
    current_player = null;
    current_room = null;

    const sign_in_div = document.getElementById('sign_in_div');
    if (!sign_in_div) {
        return;
    }
    sign_in_div.innerHTML = `
        <h1 >Please enter your name to start the game.</h1>
        <div>
            <table>
                <tr>
                    <td class="evaluation">Username:</td>
                    <td><input type="text" id="username" autofocus></td>
                    <td id="invalidation_input" class="invalidation_input"></td>
                </tr>
            </table>
            <button id="sign_in" class="primary_button">Submit</button>
        </div>
    `;

    document.getElementById('sign_in').addEventListener('click', handleSubmit);
}