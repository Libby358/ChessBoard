# Chess Game

A fully-featured, interactive chess game built with HTML5, CSS3, and vanilla JavaScript. Play against another human or challenge the computer AI with multiple difficulty levels.

## Features

### Core Gameplay
- **Complete Chess Implementation**: All standard chess rules including castling, en passant, and pawn promotion
- **Drag & Drop Interface**: Intuitive piece movement with visual feedback
- **Legal Move Highlighting**: See all valid moves when dragging a piece
- **Turn-based Play**: Clear indication of whose turn it is
- **Check Detection**: Visual and text alerts when kings are in check
- **Checkmate & Stalemate**: Automatic game end detection

### Game Modes
- **Human vs Human**: Play against another person locally
- **Human vs Computer**: Challenge AI opponents with three difficulty levels:
  - **Easy**: Random move selection
  - **Medium**: Prioritizes captures and checks
  - **Hard**: Uses minimax algorithm with position evaluation

### Special Chess Rules
- **Castling**: Both kingside and queenside castling supported
- **En Passant**: Pawn captures implemented according to official rules
- **Pawn Promotion**: Choose from Queen, Rook, Bishop, or Knight when pawns reach the end

### User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern Glass-morphism UI**: Beautiful translucent design with backdrop blur effects
- **Visual Feedback**: Hover effects, drag states, and move highlighting
- **Game Controls**: New game, undo move, mode selection, and difficulty adjustment

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software or dependencies required

### Installation
1. Clone or download the repository
2. Ensure all three files are in the same directory:
   - `index.html`
   - `main.js`
   - `style.css`
3. Open `index.html` in your web browser
4. Start playing!

### File Structure
```
chess-game/
│
├── index.html      # Main HTML structure and game board
├── main.js         # Game logic, AI, and interactivity
└── style.css       # Styling and responsive design
```

## How to Play

### Basic Controls
1. **Select a piece**: Click and drag any piece of your color
2. **See legal moves**: Green dots appear showing where you can move
3. **Make a move**: Drop the piece on a highlighted square
4. **Game modes**: Use the dropdown to switch between Human vs Human and Human vs Computer
5. **Difficulty**: Adjust AI difficulty using the difficulty selector

### Special Moves
- **Castling**: Drag the king two squares toward a rook to castle (when legal)
- **En Passant**: Capture an opponent's pawn that just moved two squares
- **Pawn Promotion**: When a pawn reaches the opposite end, choose your promotion piece

### Game Controls
- **New Game**: Reset the board to starting position
- **Undo Move**: Take back the last move (simplified implementation)
- **Mode Selection**: Choose between human and computer opponents
- **Difficulty**: Set AI strength from Easy to Hard

## Technical Implementation

### Architecture
- **Pure JavaScript**: No external libraries or frameworks
- **Event-driven**: Uses HTML5 drag and drop API
- **Modular Functions**: Clean separation of game logic, UI, and AI

### Key Components
- **Game State Management**: Tracks piece positions, turn order, and special conditions
- **Move Generation**: Calculates legal moves for each piece type
- **Check Detection**: Validates moves to prevent illegal positions
- **AI Engine**: Implements minimax algorithm with alpha-beta pruning
- **Visual Feedback**: Real-time UI updates and animations

### AI Difficulty Levels
1. **Easy (Level 1)**: Random move selection
2. **Medium (Level 2)**: Prioritizes captures and checks
3. **Hard (Level 3)**: 3-depth minimax search with position evaluation

## Browser Compatibility
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

## Mobile Support
- Responsive design adapts to all screen sizes
- Touch-friendly drag and drop on mobile devices
- Optimized piece sizes and UI elements for small screens

## Known Features
- Complete chess rule implementation
- Smooth animations and transitions
- Professional-looking UI design
- Multiple difficulty AI opponents
- Cross-device compatibility

## Future Enhancements
Potential improvements for future versions:
- Online multiplayer support
- Move history and game replay
- Chess notation display
- Save/load game functionality
- Additional AI personalities
- Tournament mode

## Contributing
This is a educational project showcasing vanilla JavaScript game development. Feel free to fork and modify for your own projects.

## License
Open source - feel free to use and modify as needed.

## Credits
- Chess piece Unicode symbols
- Modern CSS3 styling techniques
- Minimax AI algorithm implementation

---

Enjoy your game of chess! ♔♕♖♗♘♙
