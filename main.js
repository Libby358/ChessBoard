// =============================================================================
// CHESS GAME WITH STOCKFISH INTEGRATION - GLOBAL VARIABLES
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
let stockfish = null;
let currentFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Mobile-specific variables
let selectedPiece = null;
let selectedSquare = null;
let legalMovesForSelectedPiece = [];
let isMobile = false;

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
// MOBILE DETECTION AND SETUP
// =============================================================================

function detectMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0);
  
  console.log('Mobile detected:', isMobile);
  return isMobile;
}

function setupMobileEvents() {
  if (!isMobile) return;
  
  // Disable context menu on long press
  document.addEventListener('contextmenu', function(e) {
    if (e.target.classList.contains('piece') || e.target.classList.contains('square')) {
      e.preventDefault();
    }
  });
  
  // Prevent text selection
  document.addEventListener('selectstart', function(e) {
    if (e.target.classList.contains('piece') || e.target.classList.contains('square')) {
      e.preventDefault();
    }
  });
  
  // Prevent default touch behaviors that might interfere
  document.addEventListener('touchstart', function(e) {
    if (e.target.classList.contains('piece') || e.target.classList.contains('square')) {
      e.preventDefault();
    }
  }, { passive: false });
}

// =============================================================================
// STOCKFISH INTEGRATION
// =============================================================================

async function initializeStockfish() {
  try {
    // Load Stockfish from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
    script.onload = () => {
      stockfish = new Worker('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
      
      stockfish.onmessage = function(event) {
        const message = event.data;
        console.log('Stockfish:', message);
        
        if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          if (bestMove && bestMove !== '(none)') {
            executeStockfishMove(bestMove);
          }
        }
      };
      
      // Initialize Stockfish
      stockfish.postMessage('uci');
      console.log('Stockfish initialized successfully');
    };
    
    script.onerror = () => {
      console.error('Failed to load Stockfish, falling back to basic AI');
    };
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error initializing Stockfish:', error);
  }
}

function getStockfishMove() {
  if (!stockfish) {
    console.log('Stockfish not available, using basic AI');
    makeBasicComputerMove();
    return;
  }
  
  // Set skill level based on difficulty
  const skillLevels = {
    1: 1,   // Easy
    2: 10,  // Medium  
    3: 20   // Hard (max)
  };
  
  stockfish.postMessage(`setoption name Skill Level value ${skillLevels[difficulty]}`);
  stockfish.postMessage(`position fen ${currentFEN}`);
  stockfish.postMessage('go movetime 1000'); // Think for 1 second
}

function executeStockfishMove(move) {
  // Convert Stockfish move format (e.g., "e2e4") to our format
  const from = move.substring(0, 2);
  const to = move.substring(2, 4);
  const promotion = move.length > 4 ? move.substring(4) : null;
  
  console.log(`Stockfish suggests: ${from} to ${to}${promotion ? ' promote to ' + promotion : ''}`);
  
  // Find the piece at the starting position
  const startSquare = document.getElementById(from);
  if (!startSquare) {
    console.error('Invalid starting square:', from);
    return;
  }
  
  const piece = startSquare.querySelector('.piece');
  if (!piece) {
    console.error('No piece found at starting square:', from);
    return;
  }
  
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1];
  
  // Get legal moves for validation
  const pieceObject = { 
    pieceColor: pieceColor, 
    pieceType: pieceType, 
    pieceId: piece.id 
  };
  
  let legalSquares = getPossibleMoves(from, pieceObject, boardSquaresArray);
  legalSquares = isMoveValidAgainstCheck(legalSquares, from, pieceColor, pieceType);
  
  if (legalSquares.includes(to)) {
    // Handle promotion
    if (promotion) {
      // Make the move first
      makeMove(from, to, pieceColor, pieceType, legalSquares);
      // Then handle promotion
      const promotionPieces = {
        'q': 'queen',
        'r': 'rook', 
        'b': 'bishop',
        'n': 'knight'
      };
      promotePawn(to, promotionPieces[promotion] || 'queen', pieceColor);
      
      // Continue game after promotion
      isWhiteTurn = !isWhiteTurn;
      updateTurnIndicator();
      updateFEN();
      checkForCheckMate();
    } else {
      makeMove(from, to, pieceColor, pieceType, legalSquares);
    }
  } else {
    console.error('Stockfish suggested illegal move:', move);
    makeBasicComputerMove(); // Fallback to basic AI
  }
}

// =============================================================================
// FEN NOTATION HANDLING
// =============================================================================

function updateFEN() {
  // Convert current board state to FEN notation
  let fen = '';
  
  // Board position
  for (let rank = 8; rank >= 1; rank--) {
    let emptyCount = 0;
    let rankString = '';
    
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + rank;
      const piece = getPieceAtSquare(square, boardSquaresArray);
      
      if (piece.pieceColor === 'blank') {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankString += emptyCount;
          emptyCount = 0;
        }
        
        let pieceChar = '';
        switch (piece.pieceType) {
          case 'pawn': pieceChar = 'p'; break;
          case 'rook': pieceChar = 'r'; break;
          case 'knight': pieceChar = 'n'; break;
          case 'bishop': pieceChar = 'b'; break;
          case 'queen': pieceChar = 'q'; break;
          case 'king': pieceChar = 'k'; break;
        }
        
        if (piece.pieceColor === 'white') {
          pieceChar = pieceChar.toUpperCase();
        }
        
        rankString += pieceChar;
      }
    }
    
    if (emptyCount > 0) {
      rankString += emptyCount;
    }
    
    fen += rankString;
    if (rank > 1) fen += '/';
  }
  
  // Active color
  fen += isWhiteTurn ? ' w ' : ' b ';
  
  // Castling availability
  let castling = '';
  if (!whiteKingMoved) {
    if (!whiteRookH1Moved) castling += 'K';
    if (!whiteRookA1Moved) castling += 'Q';
  }
  if (!blackKingMoved) {
    if (!blackRookH8Moved) castling += 'k';
    if (!blackRookA8Moved) castling += 'q';
  }
  fen += castling || '-';
  
  // En passant square
  fen += ' ' + (enPassantSquare || '-');
  
  // Halfmove and fullmove counters (simplified)
  fen += ' 0 ' + Math.ceil(gameHistory.length / 2);
  
  currentFEN = fen;
  console.log('Current FEN:', currentFEN);
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  detectMobile();
  setupBoardSquares();
  setupPieces();
  fillBoardSquaresArray();
  setupGameControls();
  setupMobileEvents();
  updateTurnIndicator();
  updateFEN();
  initializeStockfish();
});

function fillBoardSquaresArray() {
  boardSquaresArray = [];
  const boardSquares = document.getElementsByClassName("square");
  
  for (let i = 0; i < boardSquares.length; i++) {
    let square = boardSquares[i];
    let squareId = square.getAttribute("data-square");
    
    let color = "";
    let pieceType = "";
    let pieceId = "";
    
    let pieceElement = square.querySelector(".piece");
    if (pieceElement) {
      color = pieceElement.getAttribute("color");
      pieceType = pieceElement.classList[1];
      pieceId = pieceType + squareId;
      pieceElement.id = pieceId;
    } else {
      color = "blank";
      pieceType = "blank";
      pieceId = "blank";
    }
    
    let arrayElement = {
      squareId: squareId,
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
    let square = boardSquares[i];
    
    // Desktop events
    if (!isMobile) {
      square.addEventListener("dragover", allowDrop);
      square.addEventListener("drop", drop);
    }
    
    // Mobile/touch events
    square.addEventListener("touchstart", handleSquareTouch, { passive: false });
    square.addEventListener("click", handleSquareClick);
    
    // Set square ID from data-square attribute
    let squareId = square.getAttribute("data-square");
    if (squareId) {
      square.id = squareId;
    }
  }
}

function setupPieces() {
  const pieces = document.getElementsByClassName("piece");
  
  for (let i = 0; i < pieces.length; i++) {
    let piece = pieces[i];
    
    // Desktop events
    if (!isMobile) {
      piece.addEventListener("dragstart", drag);
      piece.setAttribute("draggable", true);
    }
    
    // Mobile/touch events
    piece.addEventListener("touchstart", handlePieceTouch, { passive: false });
    piece.addEventListener("click", handlePieceClick);
    
    // Set piece ID based on type and square
    let pieceType = piece.classList[1];
    let square = piece.parentElement;
    let squareId = square.getAttribute("data-square");
    piece.id = pieceType + squareId;
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
        setTimeout(() => {
          if (stockfish) {
            getStockfishMove();
          } else {
            makeBasicComputerMove();
          }
        }, 500);
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
// MOBILE TOUCH HANDLERS
// =============================================================================

function handlePieceTouch(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (isGameOver) return;
  
  const piece = e.target;
  const pieceColor = piece.getAttribute("color");
  const square = piece.parentElement;
  const squareId = square.getAttribute("data-square");
  
  // Prevent interaction if it's computer's turn
  if (gameMode === "computer" && !isWhiteTurn) return;
  
  // Only allow selecting pieces of the current player's color
  if ((isWhiteTurn && pieceColor !== "white") || (!isWhiteTurn && pieceColor !== "black")) {
    return;
  }
  
  selectPiece(piece, squareId);
}

function handlePieceClick(e) {
  if (!isMobile) return; // Only handle clicks on mobile
  
  e.preventDefault();
  e.stopPropagation();
  
  if (isGameOver) return;
  
  const piece = e.target;
  const pieceColor = piece.getAttribute("color");
  const square = piece.parentElement;
  const squareId = square.getAttribute("data-square");
  
  // Prevent interaction if it's computer's turn
  if (gameMode === "computer" && !isWhiteTurn) return;
  
  // Only allow selecting pieces of the current player's color
  if ((isWhiteTurn && pieceColor !== "white") || (!isWhiteTurn && pieceColor !== "black")) {
    return;
  }
  
  selectPiece(piece, squareId);
}

function handleSquareTouch(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (isGameOver) return;
  
  const square = e.target;
  const squareId = square.getAttribute("data-square");
  
  handleSquareSelection(squareId);
}

function handleSquareClick(e) {
  if (!isMobile) return; // Only handle clicks on mobile
  
  e.preventDefault();
  e.stopPropagation();
  
  if (isGameOver) return;
  
  const square = e.target;
  const squareId = square.getAttribute("data-square");
  
  handleSquareSelection(squareId);
}

function selectPiece(piece, squareId) {
  // Clear previous selection
  clearSelection();
  
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1];
  
  // Set new selection
  selectedPiece = piece;
  selectedSquare = squareId;
  
  // Add visual feedback
  piece.classList.add("selected");
  piece.parentElement.classList.add("selected-square");
  
  // Get legal moves
  const pieceObject = { 
    pieceColor: pieceColor, 
    pieceType: pieceType, 
    pieceId: piece.id 
  };
  
  legalMovesForSelectedPiece = getPossibleMoves(squareId, pieceObject, boardSquaresArray);
  legalMovesForSelectedPiece = isMoveValidAgainstCheck(legalMovesForSelectedPiece, squareId, pieceColor, pieceType);
  
  // Highlight legal moves
  legalMovesForSelectedPiece.forEach(moveSquareId => {
    const moveSquare = document.getElementById(moveSquareId);
    if (moveSquare) {
      moveSquare.classList.add("legal-move");
    }
  });
  
  console.log(`Selected ${pieceType} at ${squareId}, legal moves:`, legalMovesForSelectedPiece);
}

function handleSquareSelection(squareId) {
  if (!selectedPiece || !selectedSquare) return;
  
  // Check if it's a legal move
  if (legalMovesForSelectedPiece.includes(squareId)) {
    const pieceColor = selectedPiece.getAttribute("color");
    const pieceType = selectedPiece.classList[1];
    
    console.log(`Moving ${pieceType} from ${selectedSquare} to ${squareId}`);
    
    // Make the move
    makeMove(selectedSquare, squareId, pieceColor, pieceType, legalMovesForSelectedPiece);
    
    // Clear selection
    clearSelection();
  } else if (squareId === selectedSquare) {
    // Clicking on same square deselects
    clearSelection();
  } else {
    // Check if clicking on another piece of same color
    const clickedSquare = document.getElementById(squareId);
    const clickedPiece = clickedSquare.querySelector('.piece');
    
    if (clickedPiece) {
      const clickedPieceColor = clickedPiece.getAttribute("color");
      const currentPlayerColor = isWhiteTurn ? "white" : "black";
      
      if (clickedPieceColor === currentPlayerColor) {
        // Select the new piece
        selectPiece(clickedPiece, squareId);
      } else {
        // Invalid move - clear selection
        clearSelection();
      }
    } else {
      // Invalid move to empty square - clear selection
      clearSelection();
    }
  }
}

function clearSelection() {
  // Remove visual feedback
  if (selectedPiece) {
    selectedPiece.classList.remove("selected");
  }
  
  if (selectedSquare) {
    const square = document.getElementById(selectedSquare);
    if (square) {
      square.classList.remove("selected-square");
    }
  }
  
  // Clear legal move highlights
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('legal-move');
  });
  
  // Reset selection state
  selectedPiece = null;
  selectedSquare = null;
  legalMovesForSelectedPiece = [];
}

// =============================================================================
// GAME CONTROL FUNCTIONS
// =============================================================================

function startNewGame() {
  // Clear selection
  clearSelection();
  
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
  currentFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
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
// DRAG AND DROP HANDLERS (DESKTOP ONLY)
// =============================================================================

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  if (isGameOver || isMobile) {
    ev.preventDefault();
    return;
  }
  
  const piece = ev.target;
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1];
  
  // Prevent dragging if it's computer's turn
  if (gameMode === "computer" && !isWhiteTurn) {
    ev.preventDefault();
    return;
  }
  
  // Only allow dragging pieces of the current player's color
  if ((isWhiteTurn && pieceColor !== "white") || (!isWhiteTurn && pieceColor !== "black")) {
    ev.preventDefault();
    return;
  }
  
  const startingSquareId = piece.parentNode.getAttribute("data-square");
  ev.dataTransfer.setData("text", piece.id + "|" + startingSquareId);
  
  const pieceObject = { 
    pieceColor: pieceColor, 
    pieceType: pieceType, 
    pieceId: piece.id 
  };
  
  let legalSquares = getPossibleMoves(startingSquareId, pieceObject, boardSquaresArray);
  legalSquares = isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType);
  
  let legalSquaresJson = JSON.stringify(legalSquares);
  ev.dataTransfer.setData("application/json", legalSquaresJson);
  
  // Add visual feedback
  piece.classList.add("dragging");
  
  // Highlight legal moves
  legalSquares.forEach(squareId => {
    const squareElement = document.getElementById(squareId);
    if (squareElement) {
      squareElement.classList.add("legal-move");
    }
  });
}

function drop(ev) {
  ev.preventDefault();
  if (isGameOver || isMobile) return;
  
  console.log("DROP TRIGGERED");
  
  // Remove visual feedback
  document.querySelectorAll('.piece').forEach(p => p.classList.remove('dragging'));
  document.querySelectorAll('.square').forEach(s => {
    s.classList.remove('legal-move', 'drag-over');
  });
  
  let data = ev.dataTransfer.getData("text");
  console.log("DATA:", data);
  if (!data) return;
  
  let [pieceId, startingSquareId] = data.split("|");
  let legalSquaresJson = ev.dataTransfer.getData("application/json");
  console.log("LEGAL SQUARES JSON:", legalSquaresJson);
  if (!legalSquaresJson || legalSquaresJson.length === 0) return;
  
  let legalSquares = JSON.parse(legalSquaresJson);
  console.log("PARSED LEGAL SQUARES:", legalSquares);
  
  // Find the piece by looking in the starting square, not by ID
  const startingSquare = document.getElementById(startingSquareId);
  if (!startingSquare) {
    console.log("Starting square not found:", startingSquareId);
    return;
  }
  
  const piece = startingSquare.querySelector('.piece');
  console.log("PIECE FOUND:", piece);
  if (!piece) {
    console.log("No piece found at starting square:", startingSquareId);
    return;
  }
  
  const pieceColor = piece.getAttribute("color");
  const pieceType = piece.classList[1]; // Get piece type from class list
  const destinationSquare = ev.currentTarget;
  let destinationSquareId = destinationSquare.getAttribute("data-square");
  
  console.log("PIECE COLOR:", pieceColor);
  console.log("PIECE TYPE:", pieceType);
  console.log("DESTINATION:", destinationSquareId);
  console.log("IS LEGAL MOVE:", legalSquares.includes(destinationSquareId));

  if (!legalSquares.includes(destinationSquareId)) {
    console.log("MOVE NOT LEGAL - RETURNING");
    return;
  }

  console.log("CALLING MAKEMOVE");
  makeMove(startingSquareId, destinationSquareId, pieceColor, pieceType, legalSquares);
}

// Add drag over visual feedback (desktop only)
document.addEventListener('DOMContentLoaded', function() {
  if (!isMobile) {
    document.addEventListener('dragover', function(e) {
      if (e.target.classList.contains('square')) {
        e.target.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', function(e) {
      if (e.target.classList.contains('square')) {
        e.target.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('dragend', function(e) {
      // Clean up all visual feedback
      document.querySelectorAll('.piece').forEach(p => p.classList.remove('dragging'));
      document.querySelectorAll('.square').forEach(s => {
        s.classList.remove('legal-move', 'drag-over');
      });
    });
  }
});

// =============================================================================
// MOVE EXECUTION
// =============================================================================

function makeMove(startingSquareId, destinationSquareId, pieceColor, pieceType, legalSquares = null) {
  if (isGameOver) return false;
  
  // Clear selection on mobile
  if (isMobile) {
    clearSelection();
  }
  
  // Get legal squares if not provided
  if (!legalSquares) {
    const pieceObject = getPieceAtSquare(startingSquareId, boardSquaresArray);
    legalSquares = getPossibleMoves(startingSquareId, pieceObject, boardSquaresArray);
    legalSquares = isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType);
  }

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

  // Handle special moves BEFORE moving the piece
  handleSpecialMoves(startingSquareId, destinationSquareId, pieceType, pieceColor);

  // Execute the move - FIXED: Get piece from starting square properly
  const startingSquare = document.getElementById(startingSquareId);
  const destinationSquare = document.getElementById(destinationSquareId);
  
  if (!startingSquare || !destinationSquare) {
    console.log("Could not find squares:", startingSquareId, destinationSquareId);
    return false;
  }
  
  const piece = startingSquare.querySelector('.piece');
  
  if (!piece) {
    console.log("No piece found at starting square:", startingSquareId);
    return false;
  }
  
  console.log("Moving piece from", startingSquareId, "to", destinationSquareId);
  
  // Clear destination square of any existing pieces
  const existingPieces = destinationSquare.querySelectorAll('.piece');
  existingPieces.forEach(p => p.remove());
  
  // Move the piece to destination
  destinationSquare.appendChild(piece);
  
  // Update piece ID to reflect new position
  piece.id = pieceType + destinationSquareId;
  
  // Update king position tracking
  if (pieceType === "king") {
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

  // Update board squares array
  updateBoardSquaresArray(startingSquareId, destinationSquareId, boardSquaresArray);
  
  // Update FEN after move
  updateFEN();
  
  // Check for pawn promotion
  if (pieceType === "pawn" && (destinationSquareId.charAt(1) === '8' || destinationSquareId.charAt(1) === '1')) {
    handlePawnPromotion(destinationSquareId, pieceColor);
    return true; // Don't switch turns yet, promotion modal will handle it
  }

  // Switch turns
  isWhiteTurn = !isWhiteTurn;
  updateTurnIndicator();
  updateFEN();
  
  // Check for checkmate
  if (checkForCheckMate()) {
    return true;
  }

  // Make computer move if it's computer mode and now black's turn
  if (gameMode === "computer" && !isWhiteTurn && !isGameOver) {
    setTimeout(() => {
      if (stockfish) {
        getStockfishMove();
      } else {
        makeBasicComputerMove();
      }
    }, 500);
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
        let children = newRookSquare.children;
        for (let i = children.length - 1; i >= 0; i--) {
          if (children[i].classList.contains('piece')) {
            newRookSquare.removeChild(children[i]);
          }
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
        let children = newRookSquare.children;
        for (let i = children.length - 1; i >= 0; i--) {
          if (children[i].classList.contains('piece')) {
            newRookSquare.removeChild(children[i]);
          }
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
        if (capturedSquareData) {
          capturedSquareData.pieceColor = "blank";
          capturedSquareData.pieceType = "blank";
          capturedSquareData.pieceId = "blank";
        }
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
      updateFEN();
      checkForCheckMate();
      
      // Make computer move if needed
      if (gameMode === "computer" && !isWhiteTurn && !isGameOver) {
        setTimeout(() => {
          if (stockfish) {
            getStockfishMove();
          } else {
            makeBasicComputerMove();
          }
        }, 500);
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
    if (squareData) {
      squareData.pieceType = pieceType;
      squareData.pieceId = pieceType + squareId;
    }
  }
}

// =============================================================================
// BASIC COMPUTER AI (FALLBACK)
// =============================================================================

function makeBasicComputerMove() {
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
    case 3: // Hard - Basic evaluation
      bestMove = getBestMoveEvaluated(allMoves);
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

function getBestMoveEvaluated(moves) {
  let bestMove = moves[0];
  let bestScore = -Infinity;
  
  for (let move of moves.slice(0, Math.min(moves.length, 15))) { // Limit moves for performance
    const tempBoard = deepCopyArray(boardSquaresArray);
    updateBoardSquaresArray(move.from, move.to, tempBoard);
    
    const score = evaluatePosition(tempBoard);
    if (score < bestScore) { // Black wants negative scores
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
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
// UTILITY FUNCTIONS
// =============================================================================

function updateBoardSquaresArray(currentSquareId, destinationSquareId, boardSquaresArray) {
  let currentSquare = boardSquaresArray.find(
    (element) => element.squareId === currentSquareId
  );
  let destinationSquareElement = boardSquaresArray.find(
    (element) => element.squareId === destinationSquareId
  );
  
  if (!currentSquare || !destinationSquareElement) return;
  
  let pieceColor = currentSquare.pieceColor;
  let pieceType = currentSquare.pieceType;
  let pieceId = pieceType + destinationSquareId;
  
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
  
  if (!currentSquare) {
    return { pieceColor: "blank", pieceType: "blank", pieceId: "blank" };
  }
  
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
  for (let targetSquareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(targetSquareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "rook" ||
        pieceProperties.pieceType == "queen") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for bishop/queen attacks
  legalSquares = getBishopMoves(squareId, pieceColor, boardSquaresArray);
  for (let targetSquareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(targetSquareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "bishop" ||
        pieceProperties.pieceType == "queen") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for pawn attacks
  legalSquares = checkPawnDiagonalCaptures(squareId, pieceColor, boardSquaresArray);
  for (let targetSquareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(targetSquareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "pawn") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for knight attacks
  legalSquares = getKnightMoves(squareId, pieceColor, boardSquaresArray);
  for (let targetSquareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(targetSquareId, boardSquaresArray);
    if (
      (pieceProperties.pieceType == "knight") &&
      pieceColor != pieceProperties.pieceColor
    ) return true;
  }
  
  // Check for king attacks - disable castling for check detection
  legalSquares = getKingMoves(squareId, pieceColor, boardSquaresArray, false);
  for (let targetSquareId of legalSquares) {
    let pieceProperties = getPieceAtSquare(targetSquareId, boardSquaresArray);
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
      
      if (currentSquare) {
        let squareContent = currentSquare.pieceColor;
        
        if (squareContent != "blank" && squareContent == pieceColor) {
          return;
        }
        
        legalSquares.push(String.fromCharCode(currentFile + 97) + currentRank);
      }
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

function getKingMoves(startingSquareId, pieceColor, boardSquaresArray, includeCastling = true) {
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
      
      if (currentSquare) {
        let squareContent = currentSquare.pieceColor;
        
        if (squareContent != "blank" && squareContent == pieceColor) {
          return;
        }
        
        legalSquares.push(currentSquareId);
      }
    }
  });

  // Only add castling moves if includeCastling is true
  if (includeCastling) {
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
    
    if (!currentSquare) break;
    
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
      
      if (currentSquare) {
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
  
  if (!currentSquare) return legalSquares;
  
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
  
  if (!currentSquare) return legalSquares;
  
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