# Arena Champions Project Structure

```
arena-champions/
├── public/                      # Static files served directly to client
│   ├── css/                    
│   │   └── styles.css          # Main stylesheet
│   ├── js/                     # Client-side JavaScript
│   │   ├── components/         # React components
│   │   │   └── ChampionConfirmationModal.js  # Champion hire confirmation modal
│   │   ├── gameClient.js       # Main game client class
│   │   ├── viewManager.js      # UI management
│   │   └── main.js            # Entry point script
│   └── index.html             # Main HTML file
│
├── models/                     # Database models
│   ├── champion.js            # Champion schema and model
│   ├── outfit.js              # Outfit schema and model
│   └── user.js               # User schema and model
│
├── controllers/               # Business logic
│   └── gameController.js     # Game mechanics controller
│
├── socket/                   # WebSocket handlers
│   └── gameSocket.js        # Socket.io event handlers
│
├── utils/                    # Utility functions
│   └── championGenerator.js  # Champion generation logic
│
├── config/                   # Configuration files
│   └── gameConstants.js      # Game constants and settings
│
├── server.js                # Main server file
├── package.json             # Project dependencies
└── package-lock.json        # Dependency lock file

```

## Directory Structure Guidelines

### /public
- All client-facing files
- Must be static assets only
- Files here are served directly by Express
- All paths in HTML/CSS should be relative to this directory

### /public/js/components
- React components for UI elements
- Each component in its own file
- Components should be reusable where possible
- Follow React best practices and naming conventions

### /models
- Mongoose schemas and models
- Each model in its own file
- Follow singular naming convention (e.g., champion.js not champions.js)

### /controllers
- Business logic and game mechanics
- Keep controllers focused on single responsibility
- Avoid mixing HTTP and Socket.IO logic

### /socket
- WebSocket event handlers
- Socket.IO specific code
- Connection management

### /utils
- Shared utility functions
- Helper classes
- Common functionality

### /config
- Configuration constants
- Environment variables
- Game settings

## File Naming Conventions
- Use PascalCase for class names and React components (e.g., `class GameClient`, `ChampionConfirmationModal`)
- Use camelCase for file names, variables and functions
- Add `.js` extension to all JavaScript files

## Import/Export Guidelines
- Use `module.exports` for Node.js exports
- Use ES6 imports in client-side code
- Keep circular dependencies in mind
- Export one main thing per file

## Static Asset Guidelines
- All URLs in HTML/CSS should start with `/` (e.g., `/css/styles.css`)
- Keep image assets in `/public/images`
- Keep third-party libraries in `/public/lib`
- Consider using CDN for common libraries

## Development Guidelines
- Always run server.js from project root
- Use relative paths in require() statements
- Keep node_modules in project root
- Use .gitignore to exclude node_modules

## React Component Guidelines
- Keep components focused and single-responsibility
- Use consistent naming for event handlers
- Follow React 18 best practices
- Use proper cleanup in useEffect hooks where needed
- Maintain compatibility with browser-based setup

Following this structure will help maintain consistency and avoid common pitfalls in the project organization.
