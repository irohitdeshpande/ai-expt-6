// Puzzle representation and utility functions
class PuzzleState {
    constructor(tiles, parent = null, move = null, depth = 0) {
        this.tiles = tiles;
        this.parent = parent;
        this.move = move;
        this.depth = depth;
        this.heuristic = this.calculateHeuristic();
        this.emptyPos = this.findEmptyPosition();
        this.alpha = -Infinity;
        this.beta = Infinity;
        this.pruned = false;
        this.children = [];
    }
    
    clone() {
        return new PuzzleState(
            [...this.tiles], 
            this.parent, 
            this.move, 
            this.depth
        );
    }
    
    findEmptyPosition() {
        const emptyIndex = this.tiles.indexOf(0);
        return { 
            row: Math.floor(emptyIndex / 3), 
            col: emptyIndex % 3 
        };
    }
    
    // Manhattan distance heuristic
    calculateHeuristic() {
        let distance = 0;
        for (let i = 0; i < 9; i++) {
            if (this.tiles[i] !== 0) {
                const currRow = Math.floor(i / 3);
                const currCol = i % 3;
                
                // Goal position (0-indexed)
                const targetRow = Math.floor((this.tiles[i] - 1) / 3);
                const targetCol = (this.tiles[i] - 1) % 3;
                
                distance += Math.abs(currRow - targetRow) + Math.abs(currCol - targetCol);
            }
        }
        return distance;
    }
    
    // Get possible moves from current state
    getPossibleMoves() {
        const { row, col } = this.emptyPos;
        const moves = [];
        
        // Up
        if (row > 0) moves.push('up');
        // Down
        if (row < 2) moves.push('down');
        // Left
        if (col > 0) moves.push('left');
        // Right
        if (col < 2) moves.push('right');
        
        return moves;
    }
    
    // Apply a move and return the new state
    applyMove(move) {
        const newTiles = [...this.tiles];
        const { row, col } = this.emptyPos;
        let newRow = row, newCol = col;
        
        switch (move) {
            case 'up':
                newRow = row - 1;
                break;
            case 'down':
                newRow = row + 1;
                break;
            case 'left':
                newCol = col - 1;
                break;
            case 'right':
                newCol = col + 1;
                break;
        }
        
        // Calculate indices
        const emptyIndex = row * 3 + col;
        const tileIndex = newRow * 3 + newCol;
        
        // Swap the empty space with the selected tile
        newTiles[emptyIndex] = newTiles[tileIndex];
        newTiles[tileIndex] = 0;
        
        return new PuzzleState(newTiles, this, move, this.depth + 1);
    }
    
    isGoal() {
        for (let i = 0; i < 8; i++) {
            if (this.tiles[i] !== i + 1) return false;
        }
        return this.tiles[8] === 0;
    }
    
    equals(other) {
        return this.tiles.every((tile, index) => tile === other.tiles[index]);
    }
}

// Alpha-Beta Search Algorithm
class AlphaBetaSearch {
    constructor(initialState) {
        this.initialState = initialState;
        this.nodesExplored = 0;
        this.nodesPruned = 0;
        this.solution = null;
        this.searchTree = initialState;
        this.searchInProgress = false;
        this.speed = 500; // milliseconds
        this.currentNode = null;
    }
    
    async startSearch() {
        if (this.searchInProgress) return;
        this.searchInProgress = true;
        this.nodesExplored = 0;
        this.nodesPruned = 0;
        updateStatistics(this.nodesExplored, this.nodesPruned);
        
        // Set max depth to 4 for simpler puzzle
        await this.alphaBetaSearch(this.initialState, 0, 4, -Infinity, Infinity, true);
        
        if (this.solution) {
            traceSolution(this.solution);
        } else {
            alert("No solution found within depth limit");
        }
        
        this.searchInProgress = false;
    }
    
    async alphaBetaSearch(state, currentDepth, maxDepth, alpha, beta, maximizingPlayer) {
        this.nodesExplored++;
        updateStatistics(this.nodesExplored, this.nodesPruned);
        
        state.alpha = alpha;
        state.beta = beta;
        this.currentNode = state;
        
        updateCurrentState(state);
        updateAlphaBeta(alpha, beta);
        
        await visualizeNode(state, 'exploring');
        await sleep(this.speed);
        
        if (currentDepth === maxDepth || state.isGoal()) {
            const value = -state.heuristic - state.depth;
            await visualizeNodeValue(state, value);
            return value;
        }
        
        const moves = state.getPossibleMoves();
        
        if (maximizingPlayer) {
            let maxEval = -Infinity;
            
            for (const move of moves) {
                const childState = state.applyMove(move);
                state.children.push(childState);
                
                const evalValue = await this.alphaBetaSearch(
                    childState, 
                    currentDepth + 1, 
                    maxDepth, 
                    alpha, 
                    beta, 
                    false
                );
                
                maxEval = Math.max(maxEval, evalValue);
                alpha = Math.max(alpha, evalValue);
                updateAlphaBeta(alpha, beta);
                
                if (beta <= alpha) {
                    this.nodesPruned++;
                    updateStatistics(this.nodesExplored, this.nodesPruned);
                    childState.pruned = true;
                    await visualizeNode(childState, 'pruned');
                    break; // Beta cutoff
                }
                
                if (childState.isGoal() && (currentDepth === 0 || evalValue >= maxEval)) {
                    this.solution = childState;
                }
            }
            
            await visualizeNodeValue(state, maxEval);
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of moves) {
                const childState = state.applyMove(move);
                state.children.push(childState);
                const evalValue = await this.alphaBetaSearch(
                    childState, 
                    currentDepth + 1, 
                    maxDepth, 
                    alpha, 
                    beta, 
                    true
                );
                
                minEval = Math.min(minEval, evalValue);
                beta = Math.min(beta, evalValue);
                updateAlphaBeta(alpha, beta);
                
                if (beta <= alpha) {
                    this.nodesPruned++;
                    updateStatistics(this.nodesExplored, this.nodesPruned);
                    childState.pruned = true;
                    await visualizeNode(childState, 'pruned');
                    break; // Alpha cutoff
                }
            }
            
            await visualizeNodeValue(state, minEval);
            return minEval;
        }
    }
    
    setSpeed(speed) {
        this.speed = speed;
    }
    
    reset() {
        this.searchInProgress = false;
        this.nodesExplored = 0;
        this.nodesPruned = 0;
        this.solution = null;
        this.currentNode = null;
    }
}

// Visualization functions
function renderPuzzle(puzzleState, elementId) {
    const puzzleElement = document.getElementById(elementId);
    puzzleElement.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        
        if (puzzleState.tiles[i] === 0) {
            tile.className += ' empty';
        } else {
            tile.textContent = puzzleState.tiles[i];
        }
        
        puzzleElement.appendChild(tile);
    }
}

function updateCurrentState(state) {
    renderPuzzle(state, 'currentPuzzle');
    document.getElementById('currentDepth').textContent = state.depth;
    document.getElementById('currentHeuristic').textContent = state.heuristic;
}

function updateStatistics(nodesExplored, nodesPruned) {
    document.getElementById('nodesExplored').textContent = nodesExplored;
    document.getElementById('nodesPruned').textContent = nodesPruned;
}

function updateAlphaBeta(alpha, beta) {
    document.getElementById('currentAlpha').textContent = alpha === -Infinity ? '-∞' : alpha;
    document.getElementById('currentBeta').textContent = beta === Infinity ? '∞' : beta;
}

async function visualizeNode(state, status) {
    const treeContainer = document.getElementById('treeVisualization');
    
    // Ensure level container exists
    let levelContainer = document.getElementById(`level-${state.depth}`);
    if (!levelContainer) {
        levelContainer = document.createElement('div');
        levelContainer.id = `level-${state.depth}`;
        levelContainer.className = 'tree-level';
        const levelTitle = document.createElement('h3');
        levelTitle.textContent = `Depth ${state.depth}`;
        levelContainer.appendChild(levelTitle);
        
        // Insert at the appropriate position based on depth
        const existingLevels = treeContainer.querySelectorAll('.tree-level');
        if (existingLevels.length === 0) {
            treeContainer.appendChild(levelContainer);
        } else {
            let inserted = false;
            for (let i = 0; i < existingLevels.length; i++) {
                const level = existingLevels[i];
                const levelDepth = parseInt(level.id.split('-')[1]);
                if (state.depth < levelDepth) {
                    treeContainer.insertBefore(levelContainer, level);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                treeContainer.appendChild(levelContainer);
            }
        }
    }
    
    // Create node visualization
    const nodeId = `node-${state.depth}-${Date.now()}`;
    let nodeElement = document.getElementById(nodeId);
    
    if (!nodeElement) {
        nodeElement = document.createElement('div');
        nodeElement.id = nodeId;
        nodeElement.className = 'tree-node';
        
        // Add mini puzzle
        const miniPuzzle = document.createElement('div');
        miniPuzzle.className = 'tree-node-puzzle';
        
        for (let i = 0; i < 9; i++) {
            const tile = document.createElement('div');
            tile.className = 'tree-node-tile';
            
            if (state.tiles[i] === 0) {
                tile.className += ' empty';
            } else {
                tile.textContent = state.tiles[i];
            }
            
            miniPuzzle.appendChild(tile);
        }
        
        nodeElement.appendChild(miniPuzzle);
        
        // Add node info
        const nodeInfo = document.createElement('div');
        nodeInfo.className = 'tree-node-info';
        nodeInfo.innerHTML = `
            <p>H: ${state.heuristic}</p>
            <p>D: ${state.depth}</p>
            <p>α: ${state.alpha === -Infinity ? '-∞' : state.alpha}</p>
            <p>β: ${state.beta === Infinity ? '∞' : state.beta}</p>
            <p>Move: ${state.move || 'None'}</p>
            <p>Value: ?</p>
        `;
        
        nodeElement.appendChild(nodeInfo);
        levelContainer.appendChild(nodeElement);
    }
    
    nodeElement.className = `tree-node ${status}`;
    
    // Make sure the container expands as nodes are added
    updateTreeContainer();
    
    await sleep(100); // Brief pause to make the visualization more clear
}

function updateTreeContainer() {
    const treeContainer = document.getElementById('treeVisualization');
    const treeContainerRect = treeContainer.getBoundingClientRect();
    
    // Check if we need horizontal scrolling
    const allNodes = treeContainer.querySelectorAll('.tree-node');
    let maxRight = 0;
    
    allNodes.forEach(node => {
        const nodeRect = node.getBoundingClientRect();
        const nodeRightEdge = nodeRect.left + nodeRect.width - treeContainerRect.left;
        maxRight = Math.max(maxRight, nodeRightEdge);
    });
    
    // Add some padding
    maxRight += 20;
    
    // Set the width if needed
    if (maxRight > treeContainerRect.width) {
        treeContainer.style.minWidth = `${maxRight}px`;
    }
}

async function visualizeNodeValue(state, value) {
    const treeContainer = document.getElementById('treeVisualization');
    const levelContainer = document.getElementById(`level-${state.depth}`);
    
    if (!levelContainer) return;
    
    const nodeElements = levelContainer.getElementsByClassName('tree-node');
    
    for (const nodeElement of nodeElements) {
        const miniPuzzle = nodeElement.querySelector('.tree-node-puzzle');
        const tiles = miniPuzzle.children;
        
        let matches = true;
        for (let i = 0; i < 9; i++) {
            const tileValue = tiles[i].textContent || '0';
            if (parseInt(tileValue) !== state.tiles[i]) {
                matches = false;
                break;
            }
        }
        
        if (matches) {
            const nodeInfo = nodeElement.querySelector('.tree-node-info');
            nodeInfo.innerHTML = `
                <p>H: ${state.heuristic}</p>
                <p>D: ${state.depth}</p>
                <p>α: ${state.alpha === -Infinity ? '-∞' : state.alpha}</p>
                <p>β: ${state.beta === Infinity ? '∞' : state.beta}</p>
                <p>Move: ${state.move || 'None'}</p>
                <p>Value: ${value}</p>
            `;
            
            break;
        }
    }
    
    await sleep(100); // Brief pause to make the visualization more clear
}

async function traceSolution(finalState) {
    // Trace path from final state back to initial state
    let currentState = finalState;
    const path = [];
    
    while (currentState) {
        path.unshift(currentState);
        currentState = currentState.parent;
    }
    
    // Highlight the path in the visualization
    for (const state of path) {
        await visualizeNode(state, 'optimal');
        await sleep(500);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Simpler puzzle that can be solved in 2-3 moves
    // This is a simple case where only tiles 8 and 0 are swapped
    const initialTiles = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    
    const initialState = new PuzzleState(initialTiles);
    const search = new AlphaBetaSearch(initialState);
    
    // Render initial state
    updateCurrentState(initialState);
    
    // Set up event listeners
    document.getElementById('startBtn').addEventListener('click', () => {
        search.startSearch();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        search.reset();
        document.getElementById('treeVisualization').innerHTML = '';
        document.getElementById('treeVisualization').style.minWidth = ''; // Reset width
        updateStatistics(0, 0);
        updateCurrentState(initialState);
        updateAlphaBeta(-Infinity, Infinity);
    });
    
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        search.setSpeed(1010 - e.target.value); // Invert so higher = faster
    });
});