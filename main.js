// =============================================================================
// CHESS GAME - GLOBAL VARIABLES
// =============================================================================

let boardSquaresArray = [];
let isWhiteTurn = true;
let whiteKingSquare = "e1";
let blackKingSquare = "e8";
let gameMode = "human"; // "human" or "computer"
let difficulty = 2; // 1=easy, 2=medium, 3=hard
let gameHistory = [];
let whiteKingMoved = false;
let blackKingMoved = false;
let whiteRookH1Moved = false;
let whiteRookA1Moved = false;
let blackRookH8Moved = false;
let blackRookA8Moved = false;
let enPassantSquare = null;
let isGameOver = false;

// Unicode symbols for pieces
const pieceSymbols = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  setupBoardSquares();
  setupPieces();
  fillBoardSquaresArray();
  setupGameControls();
  updateTurnIndicator();
});

function fillBoardSquaresArray() {
  boardSquaresArray = [];
  const boardSquares = document.getElementsByClassName("square");
  
  for (let i = 0; i < boardSquares.length; i++) {
    let row = 8 - Math.floor(i / 8);
    let column = String.fromCharCode(97 + (i % 8));
    let square = boardSquares[i];
    square.id = column + row;
    
    let color = "";
    let pieceType = "";
    let pieceId = "";
    
    if (square.querySelector(".piece")) {
      color = square.querySelector(".piece").getAttribute("color");
      pieceType = square.querySelector(".piece").classList[1];
      pieceId = square.querySelector(".piece").id;
    } else {
      color = "blank";
      pieceType = "blank";
      pieceId = "blank";
    }
    
    let arrayElement = {
      squareId: square.id,
      pieceColor: color,
      pieceType: pieceType,
      pieceId: pieceId
    };
    
    boardSquaresArray.push(arrayElement);
  }
}

function setupBoardSquares() {
  const boardSquares = document.getElementsByClassName("square");
  
  for (let i = 0; i < boardSquares.length; i++) {
    boardSquares[i].addEventListener("dragover", allowDrop);
    boardSquares[i].addEventListener("drop", drop);
    
    let row = 8 - Math.floor(i / 8);
    let column = String.fromCharCode(97 + (i % 8));
    let square = boardSquares[i];
    square.id = column + row;
  }
}

function setupPieces() {
  const pieces = document.getElementsByClassName("piece");
  
  for (let i = 0; i < pieces.length; i++) {
    pieces[i].addEventListener("dragstart", drag);
    pieces[i].setAttribute("draggable", true);
    pieces[i].id = pieces[i].className.split(" ")[1] + pieces[i].parentElement.id;
  }
}

function setupGameControls() {
  const newGameBtn = document.getElementById('newGameBtn');
  const undoBtn = document.getElementById('undoBtn');
  const gameModeSelect = document.getElementById('gameMode');
  const difficultySelect = document.getElementById('difficulty');

  if (newGameBtn) newGameBtn.addEventListener('click', startNewGame);
  if (undoBtn) undoBtn.addEventListener('click', undoMove);
  
  if (gameModeSelect) {
    gameModeSelect.addEventListener('change', (e) => {
      gameMode = e.target.value;
      if (gameMode === "computer" && !isWhiteTurn) {
        setTimeout(makeComputerMove, 500);
      }
    });
  }
  
  if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
      difficulty = parseInt(e.target.value);
    });
  }
}

// =============================================================================
// GAME CONTROL FUNCTIONS
// =============================================================================

function startNewGame() {
  // Reset game state
  isWhiteTurn = true;
  whiteKingSquare = "e1";
  blackKingSquare = "e8";
  gameHistory = [];
  whiteKingMoved = false;
  blackKingMoved = false;
  whiteRookH1Moved = false;
  whiteRookA1Moved = false;
  blackRookH8Moved = false;
  blackRookA8Moved = false;
  enPassantSquare = null;
  isGameOver = false;
  
  // Reset board to initial position
  location.reload(); // Simple reset - reloads the page
}

function undoMove() {
  if (gameHistory.length > 0) {
    const lastMove = gameHistory.pop();
    // Restore the board state (simplified implementation)
    location.reload();
  }
}

function updateTurnIndicator() {
  const indicator = document.getElementById('turnIndicator');
  const status = document.getElementById('gameStatus');
  
  if (!indicator) return;
  
  if (isGameOver) {
    return;
  }
  
  indicator.textContent = isWhiteTurn ? "White to move" : "Black to move";
  indicator.className = `turn-indicator ${isWhiteTurn ? 'white-turn' : 'black-turn'}`;
  
  // Check for check status
  const currentKingSquare = isWhiteTurn ? whiteKingSquare : blackKingSquare;
  const currentColor = isWhiteTurn ? "white" : "black";
  
  if (status) {
    if (isKingInCheck(currentKingSquare, currentColor, boardSquaresArray)) {
      status.textContent = `${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)} is in check!`;
    } else {
      status.textContent = "";
    }
  }
}

// =============================================================================
// DRAG AND DROP HANDLERS
// =============================================================================

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  if (isGameOver) return;
  
  const piece = ev.target;
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1];
  const pieceId = piece.id;
  
  // Prevent dragging if it's computer's turn
  if (gameMode === "computer" && !isWhiteTurn) {
    return;
  }
  
  if ((isWhiteTurn && pieceColor == "white") || (!isWhiteTurn && pieceColor == "black")) {
    const startingSquareId = piece.parentNode.id;
    ev.dataTransfer.setData("text", piece.id + "|" + startingSquareId);
    
    const pieceObject = { 
      pieceColor: pieceColor, 
      pieceType: pieceType, 
      pieceId: pieceId 
    };
    
    let legalSquares = getPossibleMoves(startingSquareId, pieceObject, boardSquaresArray);
    let legalSquaresJson = JSON.stringify(legalSquares);
    ev.dataTransfer.setData("application/json", legalSquaresJson);
  }
}

function drop(ev) {
  ev.preventDefault();
  if (isGameOver) return;
  
  let data = ev.dataTransfer.getData("text");
  if (!data) return;
  
  let [pieceId, startingSquareId] = data.split("|");
  let legalSquaresJson = ev.dataTransfer.getData("application/json");
  if (legalSquaresJson.length == 0) return;
  let legalSquares = JSON.parse(legalSquaresJson);

  const piece = document.getElementById(pieceId);
  if (!piece) return;
  
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1];
  const destinationSquare = ev.currentTarget;
  let destinationSquareId = destinationSquare.id;

  makeMove(startingSquareId, destinationSquareId, pieceColor, pieceType, legalSquares);
}

// =============================================================================
// MOVE EXECUTION
// =============================================================================

function makeMove(startingSquareId, destinationSquareId, pieceColor, pieceType, legalSquares = null) {
  if (isGameOver) return false;
  
  // Get legal squares if not provided
  if (!legalSquares) {
    const pieceObject = getPieceAtSquare(startingSquareId, boardSquaresArray);
    legalSquares = getPossibleMoves(startingSquareId, pieceObject, boardSquaresArray);
  }
  
  legalSquares = isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType);

  if (!legalSquares.includes(destinationSquareId)) {
    return false;
  }

  // Save move to history
  gameHistory.push({
    from: startingSquareId,
    to: destinationSquareId,
    piece: pieceType,
    color: pieceColor,
    boardState: deepCopyArray(boardSquaresArray)
  });

  // Handle special moves
  handleSpecialMoves(startingSquareId, destinationSquareId, pieceType, pieceColor);

  // Execute the move
  const piece = document.getElementById(pieceType + startingSquareId);
  const destinationSquare = document.getElementById(destinationSquareId);
  
  if (!piece || !destinationSquare) return false;
  
  // Clear destination square of pieces (but keep coordinates)
  let children = destinationSquare.children;
  for (let i = children.length - 1; i >= 0; i--) {
    if (!children[i].classList.contains('coordinate')) {
      destinationSquare.removeChild(children[i]);
    }
  }
  
  destinationSquare.appendChild(piece);
  
  // Update piece ID
  piece.id = pieceType + destinationSquareId;
  
  // Update king position
  if (pieceType == "king") {
    if (pieceColor === "white") {
      whiteKingSquare = destinationSquareId;
      whiteKingMoved = true;
    } else {
      blackKingSquare = destinationSquareId;
      blackKingMoved = true;
    }
  }

  // Update rook moved flags
  if (pieceType === "rook") {
    if (startingSquareId === "a1") whiteRookA1Moved = true;
    if (startingSquareId === "h1") whiteRookH1Moved = true;
    if (startingSquareId === "a8") blackRookA8Moved = true;
    if (startingSquareId === "h8") blackRookH8Moved = true;
  }

  updateBoardSquaresArray(startingSquareId, destinationSquareId, boardSquaresArray);
  
  // Check for pawn promotion
  if (pieceType === "pawn" && (destinationSquareId.charAt(1) === '8' || destinationSquareId.charAt(1) === '1')) {
    handlePawnPromotion(destinationSquareId, pieceColor);
    return true;
  }

  isWhiteTurn = !isWhiteTurn;
  updateTurnIndicator();
  
  if (checkForCheckMate()) {
    return true;
  }

  // Make computer move if it's computer mode
  if (gameMode === "computer" && !isWhiteTurn && !isGameOver) {
    setTimeout(makeComputerMove, 500);
  }
  
  return true;
}

function handleSpecialMoves(startingSquareId, destinationSquareId, pieceType, pieceColor) {
  // Handle castling
  if (pieceType === "king") {
    const startFile = startingSquareId.charAt(0);
    const destFile = destinationSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    
    // King-side castling
    if (startFile === 'e' && destFile === 'g') {
      const rookSquare = document.getElementById('h' + rank);
      const newRookSquare = document.getElementById('f' + rank);
      const rook = rookSquare.querySelector('.piece');
      
      if (rook) {
        // Clear destination and move rook
        while (newRookSquare.firstChild && !newRookSquare.firstChild.classList.contains('coordinate')) {
          newRookSquare.removeChild(newRookSquare.firstChild);
        }
        newRookSquare.appendChild(rook);
        rook.id = 'rook' + 'f' + rank;
        updateBoardSquaresArray('h' + rank, 'f' + rank, boardSquaresArray);
      }
    }
    
    // Queen-side castling
    if (startFile === 'e' && destFile === 'c') {
      const rookSquare = document.getElementById('a' + rank);
      const newRookSquare = document.getElementById('d' + rank);
      const rook = rookSquare.querySelector('.piece');
      
      if (rook) {
        // Clear destination and move rook
        while (newRookSquare.firstChild && !newRookSquare.firstChild.classList.contains('coordinate')) {
          newRookSquare.removeChild(newRookSquare.firstChild);
        }
        newRookSquare.appendChild(rook);
        rook.id = 'rook' + 'd' + rank;
        updateBoardSquaresArray('a' + rank, 'd' + rank, boardSquaresArray);
      }
    }
  }
  
  // Handle en passant
  if (pieceType === "pawn") {
    const startRank = parseInt(startingSquareId.charAt(1));
    const destRank = parseInt(destinationSquareId.charAt(1));
    
    // Set en passant square for two-square pawn moves
    if (Math.abs(destRank - startRank) === 2) {
      const middleRank = (startRank + destRank) / 2;
      enPassantSquare = destinationSquareId.charAt(0) + middleRank;
    } else {
      enPassantSquare = null;
    }
    
    // Handle en passant capture
    if (destinationSquareId === enPassantSquare && 
        Math.abs(destinationSquareId.charCodeAt(0) - startingSquareId.charCodeAt(0)) === 1) {
      const capturedPawnRank = pieceColor === "white" ? destRank - 1 : destRank + 1;
      const capturedPawnSquare = destinationSquareId.charAt(0) + capturedPawnRank;
      const capturedSquareElement = document.getElementById(capturedPawnSquare);
      
      // Remove captured pawn
      const pawnToCapture = capturedSquareElement.querySelector('.piece');
      if (pawnToCapture) {
        capturedSquareElement.removeChild(pawnToCapture);
        // Update board array
        const capturedSquareData = boardSquaresArray.find(sq => sq.squareId === capturedPawnSquare);
        capturedSquareData.pieceColor = "blank";
        capturedSquareData.pieceType = "blank";
        capturedSquareData.pieceId = "blank";
      }
    }
  } else {
    enPassantSquare = null;
  }
}

function handlePawnPromotion(squareId, color) {
  const modal = document.getElementById('promotionModal');
  const queenSpan = document.getElementById('promotionQueen');
  const rookSpan = document.getElementById('promotionRook');
  const bishopSpan = document.getElementById('promotionBishop');
  const knightSpan = document.getElementById('promotionKnight');
  
  // Set correct piece symbols based on color
  queenSpan.textContent = pieceSymbols[color].queen;
  rookSpan.textContent = pieceSymbols[color].rook;
  bishopSpan.textContent = pieceSymbols[color].bishop;
  knightSpan.textContent = pieceSymbols[color].knight;
  
  modal.style.display = 'block';
  
  // Handle promotion selection
  const promotionPieces = document.querySelectorAll('.promotion-piece');
  promotionPieces.forEach(piece => {
    piece.onclick = function() {
      const selectedPiece = this.getAttribute('data-piece');
      promotePawn(squareId, selectedPiece, color);
      modal.style.display = 'none';
      
      // Continue game after promotion
      isWhiteTurn = !isWhiteTurn;
      updateTurnIndicator();
      checkForCheckMate();
      
      // Make computer move if needed
      if (gameMode === "computer" && !isWhiteTurn && !isGameOver) {
        setTimeout(makeComputerMove, 500);
      }
    };
  });
}

function promotePawn(squareId, pieceType, color) {
  const square = document.getElementById(squareId);
  const pawn = square.querySelector('.piece');
  
  if (pawn) {
    // Remove pawn
    square.removeChild(pawn);
    
    // Create new piece
    const newPiece = document.createElement('div');
    newPiece.className = `piece ${pieceType}`;
    newPiece.setAttribute('color', color);
    newPiece.setAttribute('draggable', true);
    newPiece.id = pieceType + squareId;
    newPiece.textContent = pieceSymbols[color][pieceType];
    
    square.appendChild(newPiece);
    
    // Add event listeners
    newPiece.addEventListener("dragstart", drag);
    
    // Update board array
    const squareData = boardSquaresArray.find(sq => sq.squareId === squareId);
    squareData.pieceType = pieceType;
    squareData.pieceId = pieceType + squareId;
  }
}

// =============================================================================
// COMPUTER AI
// =============================================================================

function makeComputerMove() {
  if (isWhiteTurn || isGameOver) return;
  
  const allMoves = getAllPossibleMovesWithDetails(boardSquaresArray, "black");
  if (allMoves.length === 0) return;
  
  let bestMove;
  
  switch(difficulty) {
    case 1: // Easy - Random move
      bestMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      break;
    case 2: // Medium - Prefer captures and checks
      bestMove = getBestMoveSimple(allMoves);
      break;
    case 3: // Hard - Minimax with evaluation
      bestMove = getBestMoveMinimax(allMoves, 3);
      break;
    default:
      bestMove = allMoves[Math.floor(Math.random() * allMoves.length)];
  }
  
  if (bestMove) {
    makeMove(bestMove.from, bestMove.to, "black", bestMove.pieceType, bestMove.legalSquares);
  }
}

function getBestMoveSimple(moves) {
  // Prioritize captures, then checks, then random
  const captures = moves.filter(move => {
    const targetSquare = getPieceAtSquare(move.to, boardSquaresArray);
    return targetSquare.pieceColor === "white";
  });
  
  if (captures.length > 0) {
    return captures[Math.floor(Math.random() * captures.length)];
  }
  
  // Look for checks
  const checks = moves.filter(move => {
    const tempBoard = deepCopyArray(boardSquaresArray);
    updateBoardSquaresArray(move.from, move.to, tempBoard);
    return isKingInCheck(whiteKingSquare, "white", tempBoard);
  });
  
  if (checks.length > 0) {
    return checks[Math.floor(Math.random() * checks.length)];
  }
  
  return moves[Math.floor(Math.random() * moves.length)];
}

function getBestMoveMinimax(moves, depth) {
  let bestMove = moves[0];
  let bestScore = -Infinity;
  
  for (let move of moves.slice(0, Math.min(moves.length, 20))) { // Limit moves for performance
    const tempBoard = deepCopyArray(boardSquaresArray);
    updateBoardSquaresArray(move.from, move.to, tempBoard);
    
    const score = minimax(tempBoard, depth - 1, true, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
  if (depth === 0) {
    return evaluatePosition(board);
  }
  
  const color = isMaximizing ? "white" : "black";
  const moves = getAllPossibleMovesWithDetails(board, color);
  
  if (moves.length === 0) {
    // Check if it's checkmate or stalemate
    const kingSquare = color === "white" ? whiteKingSquare : blackKingSquare;
    if (isKingInCheck(kingSquare, color, board)) {
      return isMaximizing ? -10000 : 10000; // Checkmate
    }
    return 0; // Stalemate
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of moves.slice(0, 10)) { // Limit for performance
      const tempBoard = deepCopyArray(board);
      updateBoardSquaresArray(move.from, move.to, tempBoard);
      const eval = minimax(tempBoard, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves.slice(0, 10)) { // Limit for performance
      const tempBoard = deepCopyArray(board);
      updateBoardSquaresArray(move.from, move.to, tempBoard);
      const eval = minimax(tempBoard, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
}

function evaluatePosition(board) {
  const pieceValues = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0
  };
  
  let score = 0;
  
  for (let square of board) {
    if (square.pieceColor === "white") {
      score += pieceValues[square.pieceType] || 0;
    } else if (square.pieceColor === "black") {
      score -= pieceValues[square.pieceType] || 0;
    }
  }
  
  return score;
}

function getAllPossibleMovesWithDetails(squaresArray, color) {
  const moves = [];
  
  for (let square of squaresArray) {
    if (square.pieceColor === color) {
      const pieceObject = {
        pieceColor: square.pieceColor,
        pieceType: square.pieceType,
        pieceId: square.pieceId
      };
      
      let legalSquares = getPossibleMoves(square.squareId, pieceObject, squaresArray);
      legalSquares = isMoveValidAgainstCheck(legalSquares, square.squareId, square.pieceColor, square.pieceType);
      
      for (let targetSquare of legalSquares) {
        moves.push({
          from: square.squareId,
          to: targetSquare,
          pieceType: square.pieceType,
          legalSquares: legalSquares
        });
      }
    }
  }
  
  return moves;
}

// =============================================================================
// MOVE GENERATION
// =============================================================================

function getPossibleMoves(startingSquareId, piece, boardSquaresArray) {
  const pieceColor = piece.pieceColor;
  const pieceType = piece.pieceType;
  let legalSquares = [];
  
  switch (pieceType) {
    case "rook":
      legalSquares = getRookMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
    case "bishop":
      legalSquares = getBishopMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
    case "queen":
      legalSquares = getQueenMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
    case "knight":
      legalSquares = getKnightMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
    case "pawn":
      legalSquares = getPawnMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
    case "king":
      legalSquares = getKingMoves(startingSquareId, pieceColor, boardSquaresArray);
      break;
  }
  
  return legalSquares;
}

// =============================================================================
// PIECE-SPECIFIC MOVE GENERATION
// =============================================================================

function getKnightMoves(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charCodeAt(0) - 97;
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let legalSquares = [];

  const moves = [
    [-2, 1], [-1, 2], [1, 2], [2, 1],
    [2, -1], [1, -2], [-1, -2], [-2, -1],
  ];
  
  moves.forEach((move) => {
    let currentFile = file + move[0];
    let currentRank = rankNumber + move[1];
    
    if (currentFile >= 0 && currentFile <= 7 && currentRank > 0 && currentRank <= 8) {
      let currentSquareId = String.fromCharCode(currentFile + 97) + currentRank;
      let currentSquare = boardSquaresArray.find(
        (element) => element.squareId === currentSquareId
      );
      let squareContent = currentSquare.pieceColor;
      
      if (squareContent != "blank" && squareContent == pieceColor) {
        return;
      }
      
      legalSquares.push(String.fromCharCode(currentFile + 97) + currentRank);
    }
  });
  
  return legalSquares;
}

function getRookMoves(startingSquareId, pieceColor, boardSquaresArray) {
  let moveToEighthRankSquares = moveToEighthRank(startingSquareId, pieceColor, boardSquaresArray);
  let moveToFirstRankSquares = moveToFirstRank(startingSquareId, pieceColor, boardSquaresArray);
  let moveToAFileSquares = moveToAFile(startingSquareId, pieceColor, boardSquaresArray);
  let moveToHFileSquares = moveToHFile(startingSquareId, pieceColor, boardSquaresArray);
  
  let legalSquares = [
    ...moveToEighthRankSquares,
    ...moveToFirstRankSquares,
    ...moveToAFileSquares,
    ...moveToHFileSquares,
  ];
  
  return legalSquares;
}

function getBishopMoves(startingSquareId, pieceColor, boardSquaresArray) {
  let moveToEighthRankHFileSquares = moveToEighthRankHFile(startingSquareId, pieceColor, boardSquaresArray);
  let moveToEighthRankAFileSquares = moveToEighthRankAFile(startingSquareId, pieceColor, boardSquaresArray);
  let moveToFirstRankHFileSquares = moveToFirstRankHFile(startingSquareId, pieceColor, boardSquaresArray);
  let moveToFirstRankAFileSquares = moveToFirstRankAFile(startingSquareId, pieceColor, boardSquaresArray);
  
  let legalSquares = [
    ...moveToEighthRankHFileSquares,
    ...moveToEighthRankAFileSquares,
    ...moveToFirstRankHFileSquares,
    ...moveToFirstRankAFileSquares,
  ];
  
  return legalSquares;
}

function getQueenMoves(startingSquareId, pieceColor, boardSquaresArray) {
  let bishopMoves = getBishopMoves(startingSquareId, pieceColor, boardSquaresArray);
  let rookMoves = getRookMoves(startingSquareId, pieceColor, boardSquaresArray);
  let legalSquares = [...bishopMoves, ...rookMoves];
  return legalSquares;
}

function getKingMoves(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charCodeAt(0) - 97;
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let legalSquares = [];
  
  const moves = [
    [0, 1], [0, -1], [1, 1], [1, -1],
    [-1, 0], [-1, 1], [-1, -1], [1, 0],
  ];

  moves.forEach((move) => {
    let currentFile = file + move[0];
    let currentRank = rankNumber + move[1];

    if (currentFile >= 0 && currentFile <= 7 && currentRank > 0 && currentRank <= 8) {
      let currentSquareId = String.fromCharCode(currentFile + 97) + currentRank;
      let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
      let squareContent = currentSquare.pieceColor;
      
      if (squareContent != "blank" && squareContent == pieceColor) {
        return;
      }
      
      legalSquares.push(currentSquareId);
    }
  });

  // Add castling moves
  if (pieceColor === "white" && !whiteKingMoved && startingSquareId === "e1") {
    // King-side castling
    if (!whiteRookH1Moved && canCastle(pieceColor, true, boardSquaresArray)) {
      legalSquares.push("g1");
    }
    // Queen-side castling
    if (!whiteRookA1Moved && canCastle(pieceColor, false, boardSquaresArray)) {
      legalSquares.push("c1");
    }
  }
  
  if (pieceColor === "black" && !blackKingMoved && startingSquareId === "e8") {
    // King-side castling
    if (!blackRookH8Moved && canCastle(pieceColor, true, boardSquaresArray)) {
      legalSquares.push("g8");
    }
    // Queen-side castling
    if (!blackRookA8Moved && canCastle(pieceColor, false, boardSquaresArray)) {
      legalSquares.push("c8");
    }
  }

  return legalSquares;
}

function getPawnMoves(startingSquareId, pieceColor, boardSquaresArray) {
  let diagonalSquares = checkPawnDiagonalCaptures(startingSquareId, pieceColor, boardSquaresArray);
  let forwardSquares = checkPawnForwardMoves(startingSquareId, pieceColor, boardSquaresArray);
  let legalSquares = [...diagonalSquares, ...forwardSquares];
  return legalSquares;
}

// =============================================================================
// DIRECTIONAL MOVEMENT FUNCTIONS
// =============================================================================

function moveToEighthRank(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (currentRank != 8) {
    currentRank++;
    let currentSquareId = file + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToFirstRank(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (currentRank != 1) {
    currentRank--;
    let currentSquareId = file + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToAFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  let currentFile = file;
  let legalSquares = [];

  while (currentFile != "a") {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) - 1);
    let currentSquareId = currentFile + rank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToHFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  let currentFile = file;
  let legalSquares = [];
  
  while (currentFile != "h") {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) + 1);
    let currentSquareId = currentFile + rank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

// =============================================================================
// DIAGONAL MOVEMENT FUNCTIONS
// =============================================================================

function moveToEighthRankAFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentFile = file;
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (!(currentFile == "a" || currentRank == 8)) {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) - 1);
    currentRank++;
    let currentSquareId = currentFile + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToEighthRankHFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentFile = file;
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (!(currentFile == "h" || currentRank == 8)) {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) + 1);
    currentRank++;
    let currentSquareId = currentFile + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToFirstRankAFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentFile = file;
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (!(currentFile == "a" || currentRank == 1)) {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) - 1);
    currentRank--;
    let currentSquareId = currentFile + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

function moveToFirstRankHFile(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let currentFile = file;
  let currentRank = rankNumber;
  let legalSquares = [];
  
  while (!(currentFile == "h" || currentRank == 1)) {
    currentFile = String.fromCharCode(currentFile.charCodeAt(0) + 1);
    currentRank--;
    let currentSquareId = currentFile + currentRank;
    let currentSquare = boardSquaresArray.find(
      (element) => element.squareId === currentSquareId
    );
    let squareContent = currentSquare.pieceColor;
    
    if (squareContent != "blank" && squareContent == pieceColor) {
      return legalSquares;
    }
    
    legalSquares.push(currentSquareId);
    
    if (squareContent != "blank" && squareContent != pieceColor) {
      return legalSquares;
    }
  }
  
  return legalSquares;
}

// =============================================================================
// PAWN MOVEMENT FUNCTIONS
// =============================================================================

function checkPawnDiagonalCaptures(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let legalSquares = [];
  let currentFile = file;
  let currentRank = rankNumber;

  const direction = pieceColor == "white" ? 1 : -1;
  
  if (!(rank == 8 && direction == 1) && !(rank == 1 && direction == -1)) {
    currentRank += direction;
  }
    
  for (let i = -1; i <= 1; i += 2) {
    currentFile = String.fromCharCode(file.charCodeAt(0) + i);
    
    if (currentFile >= "a" && currentFile <= "h" && currentRank <= 8 && currentRank >= 1) {
      let currentSquareId = currentFile + currentRank;
      let currentSquare = boardSquaresArray.find(
        (element) => element.squareId === currentSquareId
      );
      let squareContent = currentSquare.pieceColor;
      
      // Regular capture
      if (squareContent != "blank" && squareContent != pieceColor) {
        legalSquares.push(currentSquareId);
      }
      
      // En passant capture
      if (squareContent == "blank" && currentSquareId === enPassantSquare) {
        legalSquares.push(currentSquareId);
      }
    }
  }
  
  return legalSquares;
}

function checkPawnForwardMoves(startingSquareId, pieceColor, boardSquaresArray) {
  const file = startingSquareId.charAt(0);
  const rank = startingSquareId.charAt(1);
  const rankNumber = parseInt(rank);
  let legalSquares = [];

  let currentFile = file;
  let currentRank = rankNumber;

  const direction = pieceColor == "white" ? 1 : -1;
  currentRank += direction;
  
  if (currentRank < 1 || currentRank > 8) return legalSquares;
  
  let currentSquareId = currentFile + currentRank;
  let currentSquare = boardSquaresArray.find(
    (element) => element.squareId === currentSquareId
  );
  let squareContent = currentSquare.pieceColor;
  
  if (squareContent != "blank") return legalSquares;
  
  legalSquares.push(currentSquareId);
  
  // Check for two-square move from starting position
  if (!((rankNumber == 2 && pieceColor == "white") || (rankNumber == 7 && pieceColor == "black"))) {
    return legalSquares;
  }
  
  currentRank += direction;
  if (currentRank < 1 || currentRank > 8) return legalSquares;
  
  currentSquareId = currentFile + currentRank;
  currentSquare = boardSquaresArray.find(
    (element) => element.squareId === currentSquareId
  );
  squareContent = currentSquare.pieceColor;
  
  if (squareContent != "blank") return legalSquares;
  
  legalSquares.push(currentSquareId);
  return legalSquares;
}

// =============================================================================
// CASTLING FUNCTIONS
// =============================================================================

function canCastle(color, kingside, boardSquaresArray) {
  const rank = color === "white" ? "1" : "8";
  const kingSquare = "e" + rank;
  
  // Check if king is in check
  if (isKingInCheck(kingSquare, color, boardSquaresArray)) {
    return false;
  }
  
  if (kingside) {
    // Check if squares between king and rook are empty
    const f = getPieceAtSquare("f" + rank, boardSquaresArray);
    const g = getPieceAtSquare("g" + rank, boardSquaresArray);
    
    if (f.pieceColor !== "blank" || g.pieceColor !== "blank") {
      return false;
    }
    
    // Check if king would be in check on f and g squares
    if (isKingInCheck("f" + rank, color, boardSquaresArray) || 
        isKingInCheck("g" + rank, color, boardSquaresArray)) {
      return false;
    }
  } else {
    // Queen-side castling
    const d = getPieceAtSquare("d" + rank, boardSquaresArray);
    const c = getPieceAtSquare("c" + rank, boardSquaresArray);
    const b = getPieceAtSquare("b" + rank, boardSquaresArray);
    
    if (d.pieceColor !== "blank" || c.pieceColor !== "blank" || b.pieceColor !== "blank") {
      return false;
    }
    
    // Check if king would be in check on d and c squares
    if (isKingInCheck("d" + rank, color, boardSquaresArray) || 
        isKingInCheck("c" + rank, color, boardSquaresArray)) {
      return false;
    }
  }
  
  return true;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function updateBoardSquaresArray(currentSquareId, destinationSquareId, boardSquaresArray) {
  let currentSquare = boardSquaresArray.find(
    (element) => element.squareId === currentSquareId
  );
  let destinationSquareElement = boardSquaresArray.find(
    (element) => element.squareId === destinationSquareId
  );
  
  let pieceColor = currentSquare.pieceColor;
  let pieceType = currentSquare.pieceType;
  let pieceId = currentSquare.pieceId;
  
  destinationSquareElement.pieceColor = pieceColor;
  destinationSquareElement.pieceType = pieceType;
  destinationSquareElement.pieceId = pieceId;
  
  currentSquare.pieceColor = "blank";
  currentSquare.pieceType = "blank";
  currentSquare.pieceId = "blank";
}

function deepCopyArray(array) {
  let arrayCopy = array.map(element => {
    return { ...element }
  });
  return arrayCopy;
}

function getPieceAtSquare(squareId, boardSquaresArray) {
  let currentSquare = boardSquaresArray.find(
    (element) => element.squareId === squareId
  );
  
  const color = currentSquare.pieceColor;
  const pieceType = currentSquare.pieceType;
  const pieceId = currentSquare.pieceId;
  
  return { pieceColor: color, pieceType: pieceType, pieceId: pieceId };
}

// =============================================================================
// CHECK AND CHECKMATE DETECTION
// =============================================================================

function isKingInCheck(squareId, pieceColor, boardSquaresArray) {
  // Check for rook/queen attacks
  let legalSquares = getRookMoves(squareId, pieceColor, boardSquaresArray);
  for (let squareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "rook" ||
        pieceProperties.pieceType == "queen") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for bishop/queen attacks
  legalSquares = getBishopMoves(squareId, pieceColor, boardSquaresArray);
  for (let squareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "bishop" ||
        pieceProperties.pieceType == "queen") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for pawn attacks
  legalSquares = checkPawnDiagonalCaptures(squareId, pieceColor, boardSquaresArray);
  for (let squareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "pawn") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for knight attacks
  legalSquares = getKnightMoves(squareId, pieceColor, boardSquaresArray);
  for (let squareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "knight") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for king attacks
  legalSquares = getKingMoves(squareId, pieceColor, boardSquaresArray);
  for (let squareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "king") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  return false;
}

function isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType) {
  let kingSquare = isWhiteTurn ? whiteKingSquare : blackKingSquare;
  let boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
  let legalSquaresCopy = legalSquares.slice();
  
  legalSquaresCopy.forEach((element) => {
    let destinationId = element;
    boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
    updateBoardSquaresArray(startingSquareId, destinationId, boardSquaresArrayCopy);
    
    if (pieceType != "king" && isKingInCheck(kingSquare, pieceColor, boardSquaresArrayCopy)) {
      legalSquares = legalSquares.filter((item) => item != destinationId);
    }
    if (pieceType == "king" && isKingInCheck(destinationId, pieceColor, boardSquaresArrayCopy)) {
      legalSquares = legalSquares.filter((item) => item != destinationId);
    }
  });
  
  return legalSquares;
}

function checkForCheckMate() {
  let kingSquare = isWhiteTurn ? whiteKingSquare : blackKingSquare;
  let pieceColor = isWhiteTurn ? "white" : "black";
  let boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
  let kingIsCheck = isKingInCheck(kingSquare, pieceColor, boardSquaresArrayCopy);
  
  let possibleMoves = getAllPossibleMoves(boardSquaresArrayCopy, pieceColor);
  
  if (possibleMoves.length === 0) {
    let message = "";
    if (kingIsCheck) {
      // Checkmate
      isWhiteTurn ? (message = "Black Wins by Checkmate!") : (message = "White Wins by Checkmate!");
    } else {
      // Stalemate
      message = "Game ended in Stalemate!";
    }
    isGameOver = true;
    showAlert(message);
    return true;
  }
  
  return false;
}

function getAllPossibleMoves(squaresArray, color) {
  return squaresArray
    .filter((square) => square.pieceColor === color)
    .flatMap((square) => {
      const { pieceColor, pieceType, pieceId } = getPieceAtSquare(square.squareId, squaresArray);
      if (pieceId === "blank") return [];
      
      let squaresArrayCopy = deepCopyArray(squaresArray);
      const pieceObject = { pieceColor: pieceColor, pieceType: pieceType, pieceId: pieceId };
      let legalSquares = getPossibleMoves(square.squareId, pieceObject, squaresArrayCopy);
      legalSquares = isMoveValidAgainstCheck(legalSquares, square.squareId, pieceColor, pieceType);
      return legalSquares;
    });
}

// =============================================================================
// UI FUNCTIONS
// =============================================================================

function showAlert(message) {
  const alert = document.getElementById("alert");
  alert.innerHTML = message;
  alert.style.display = "block";

  setTimeout(function () {
    alert.style.display = "none";
  }, 5000);
}