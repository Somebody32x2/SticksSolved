let USING_WRAPAROUND = false;
let CAN_ATTACK_ZERO = false;

// Find valid hands
let valid_hands = [];

for (let hand1 = 1; hand1 < 5; hand1++) {
    for (let hand2 = 0; hand2 < 5; hand2++) {
        let hands = [hand1, hand2].sort();
        if (!valid_hands.some(e => e[0] === hands[0] && e[1] === hands[1])) {
            valid_hands.push([hand1, hand2].sort());
        }
    }
}

for (const validHand of valid_hands) {
    let td = document.createElement("td");
    td.innerHTML = `<p class="hand_type_hint">${lookupHandNumber(validHand)}</p><p>${validHand.join(", ")}</p><p class="tal">${tallies(validHand[0])} ${tallies(validHand[1])}</p>`;
    td.classList.add("rowcol_label");
    document.getElementById("thead").appendChild(td);
}
// add the column headers
for (const validHand of valid_hands) {
    let tr = document.createElement("tr");
    tr.innerHTML = `<td class="rowcol_label"><p class="hand_type_hint">${lookupHandNumber(validHand)}</p><p>${validHand.join(", ")}</p><p class="tal">${tallies(validHand[0])} ${tallies(validHand[1])}</p></td>`;
    document.getElementById("main").appendChild(tr);
}

let table_outcomes = [[]]
// Create the positions for the table
for (let i = 0; i < valid_hands.length; i++) {
    table_outcomes.push([]);
    for (let j = 0; j < valid_hands.length; j++) {
        table_outcomes[i].push({});
    }
}
// Fill the table
for (const [y, p2_hand] of valid_hands.entries()) {
    for (const [x, p1_hand] of valid_hands.entries()) {
        // Create the element
        let td = document.createElement("td");
        td.classList.add("state_cell");
        td.id = `state_${x}_${y}`;
        // Add the element to the table
        document.getElementById("main").children[y + 1].appendChild(td);

        // Check if this state is immediately terminal (winning)
        if (p2_hand[0] === 0 && (USING_WRAPAROUND ? p1_hand.includes(5 - p2_hand[1]) : p1_hand.some(e => p2_hand[1] + e >= 5))) {
            td.classList.add("T_W");
            td.innerHTML = "W";
            table_outcomes[y][x].type = "W";
            table_outcomes[y][x].moves = [];
        }

        calculate_cell_moves(x, y);

        // Make the onhover show the moves
        td.onmouseover = function () {
            for (const move of table_outcomes[y][x].moves) {
                let [new_p1, new_p2] = move;
                document.getElementById(`state_${lookupHandNumber(new_p2)}_${lookupHandNumber(new_p1)}`).classList.add("highlight");
            }
        }
        td.onmouseout = function () {
            for (const move of table_outcomes[y][x].moves) {
                let [new_p1, new_p2] = move;
                document.getElementById(`state_${lookupHandNumber(new_p2)}_${lookupHandNumber(new_p1)}`).classList.remove("highlight");
            }
        }

        table_outcomes[y][x].id = `state_${x}_${y}`;
    }
}

function calculate_cell_moves(x, y) {
    if (table_outcomes[y][x].moves) {
        return table_outcomes[y][x].moves;
    }
    if (table_outcomes[y][x].type === "W") {
        return [];
    }
    let p1_hand = valid_hands[x];
    let p2_hand = valid_hands[y];

    let possible_moves = [];
    // Add each attack
    for (const [hand_i, hand_n] of p1_hand.entries()) {
        for (const [target_i, target_n] of p2_hand.entries()) {
            if (hand_n === 0) continue;
            if (!CAN_ATTACK_ZERO && target_n === 0) continue;
            // We know we cannot win
            let new_p2 = structuredClone(p2_hand);
            if (USING_WRAPAROUND) new_p2[target_i] = (new_p2[target_i] + hand_n) % 5;
            else {
                new_p2[target_i] = target_n + hand_n;
                if (new_p2[target_i] >= 5) {
                    new_p2[target_i] = 0;
                }
            }
            let move = [p1_hand, new_p2.sort()]
            if (!possible_moves.some(e => e[0][0] === move[0][0] && e[0][1] === move[0][1] && e[1][0] === move[1][0] && e[1][1] === move[1][1])) {
                possible_moves.push(move);
            }
        }
    }
    // Add each split/merge
    for (let new_h1_n = 0; new_h1_n < Math.min(4, p1_hand[0] + p1_hand[1]); new_h1_n++) {
        let new_h1 = [new_h1_n, p1_hand[0] + p1_hand[1] - new_h1_n].sort();
        if (new_h1[0] >= 5 || new_h1[1] >= 5) continue;
        if (!(new_h1[0] === p1_hand[0] && new_h1[1] === p1_hand[1]) && !possible_moves.some(e => e[0][0] === new_h1[0] && e[0][1] === new_h1[1] && e[1][0] === p2_hand[0] && e[1][1] === p2_hand[1])) {
            possible_moves.push([new_h1, p2_hand]);
        }
    }
    table_outcomes[y][x].moves = possible_moves;
    return possible_moves;
}

// Analyze the forced paths and set types
function simpleIterateCellType(x, y) {
    // console.log(`Analyzing ${x}, ${y}`);
    let cell = table_outcomes[y][x];
    if (cell.type && cell.type !== "U" && cell.type !== "FU") {
        return cell.type;
    }
    let possible_moves = structuredClone(cell.moves);
    if (possible_moves.length === 1) {
        let forced = true;
        let forcedOutcome = table_outcomes[lookupHandNumber(possible_moves[0][0])][lookupHandNumber(possible_moves[0][1])].type;
        if (forcedOutcome === "W" || forcedOutcome === "PW" || forcedOutcome === "FW") {
            cell.type = "FL";
            table_outcomes[y][x].type = "FL";
            return "FL";
        } else if (forcedOutcome === "FL") {
            cell.type = "FW";
            table_outcomes[y][x].type = "FW";
            return "FW";
        }
        cell.type = "FU";
        table_outcomes[y][x].type = "FU";
        return "FU";
    }
    let num_loss_moves = 0;
    for (const possibleMove of possible_moves) {
        let move_outcome = table_outcomes[lookupHandNumber(possibleMove[0])][lookupHandNumber(possibleMove[1])]?.type;
        if (move_outcome === "FL") {
            cell.type = "PW";
            table_outcomes[y][x].type = "PW";
            return "PW";
        }
        if (move_outcome === "W" || move_outcome === "FW" || move_outcome === "PW") {
            num_loss_moves++;
        }
    }
    if (num_loss_moves === possible_moves.length) {
        cell.type = "FL";
        table_outcomes[y][x].type = "FL";
        return;
    }
    cell.type = "U";
    table_outcomes[y][x].type = "U";
    return "U";
}

function setUpTable() {

}

// Analyze every cell, and set its type if we have it
for (let _iterations = 0; _iterations < 3; _iterations++) {
    for (let i = 0; i < valid_hands.length; i++) {
        for (let j = 0; j < valid_hands.length; j++) {
            let res = simpleIterateCellType(i, j);
            if (res) {
                document.getElementById(`state_${i}_${j}`).innerHTML = res;
                document.getElementById(`state_${i}_${j}`).classList.remove("T_U", "T_PU")
                document.getElementById(`state_${i}_${j}`).classList.add(`T_${res}`);
            }
        }
    }
}

function lookupHandNumber(hand) {
    return valid_hands.findIndex(e => e[0] === hand[0] && e[1] === hand[1]);
}

// for every cell, look at its possible moves.
// if any move starts a forced chain of moves that ends in a win, mark it and each along the path as a forced win