

//1:USA  2:UK  3:French  4:Russia  5:Poland
playerlist=[];


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



function submit(){
    const player = document.getElementById('username').value;
    playerlist.push(player);
    const sign_in_div = document.getElementById('sign_in_div')
    const select_player = document.createElement("div");
    select_player.id = "select_player_id";      
    select_player.className = "presenting";      
    select_player.innerHTML = 
    `
    <div class = "presenting_with_block">
        <h2>Welcome, <span class="username">${player}</span></h2>
        <h2>Select a player that you want to challenge..</h2>
        <h2>Or, you can wait for a player to challenge you</h2>
    </div> 
    <button id ="log_out">log out</button>   
    `    
    ;
    sign_in_div.replaceWith(select_player);
}

// `

function log_out(){
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
