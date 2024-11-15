# React Browser Development Requirements

## Overview
This document outlines requirements and best practices for developing React components that run directly in the browser without build tools (Babel, webpack, etc.). Following these guidelines ensures components work correctly without transpilation or bundling.

## Component Structure Requirements

### 1. Avoid JSX Syntax
JSX requires transpilation and cannot be used directly in the browser.

```javascript
// ❌ DON'T use JSX syntax
const MyComponent = () => {
  return (
    <div className="container">
      <h1>Hello World</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
};

// ✅ DO use React.createElement
const MyComponent = () => {
  return React.createElement('div',
    { className: 'container' },
    [
      React.createElement('h1', { key: 'title' }, 'Hello World'),
      React.createElement('button', 
        { 
          key: 'button',
          onClick: handleClick 
        }, 
        'Click Me'
      )
    ]
  );
};
```

### 2. Module Exports and Imports
Browser-based components cannot use ES6 module syntax.

```javascript
// ❌ DON'T use ES6 module syntax
import React from 'react';
import { SomeComponent } from './SomeComponent';
export default MyComponent;

// ✅ DO expose components to window object
const MyComponent = function() { ... };
window.MyComponent = MyComponent;
```

### 3. React Hooks Usage
Access React hooks through the React object directly.

```javascript
// ❌ DON'T destructure or import hooks
const { useState, useEffect } = React;
import { useState } from 'react';

// ✅ DO access hooks via React object
const [state, setState] = React.useState(initial);
React.useEffect(() => {
  // effect code
}, []);
```

## Script Loading Requirements

### Required Script Order
```html
<!-- 1. React core libraries must load first -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

<!-- 2. Optional: Add debug check -->
<script>
    console.log('React dependencies loaded:', {
        react: !!window.React,
        reactDOM: !!window.ReactDOM
    });
</script>

<!-- 3. Load components -->
<script src="/js/components/MyComponent.js"></script>

<!-- 4. Optional: Verify component loading -->
<script>
    console.log('Components loaded:', {
        MyComponent: !!window.MyComponent,
        type: typeof window.MyComponent
    });
</script>
```

## Component Initialization Requirements

### Creating React Roots
When rendering components, create and manage roots properly:

```javascript
// Create root once and reuse
if (!this.componentRoot) {
    this.componentRoot = ReactDOM.createRoot(containerElement);
}

// Render into the root
this.componentRoot.render(
    React.createElement(window.MyComponent, {
        prop1: value1,
        prop2: value2
    })
);

// Cleanup when needed
this.componentRoot.unmount();
```

## Debug Recommendations

### Component Loading Verification
Add debugging logs in component files:

```javascript
console.log('Loading MyComponent...');

const MyComponent = function() { ... };

window.MyComponent = MyComponent;

console.log('MyComponent loaded:', {
    exists: !!window.MyComponent,
    type: typeof window.MyComponent
});
```

### Development Tools
- Use browser developer tools to verify script loading in Network tab
- Check Console for component loading confirmation
- Verify component availability on window object
- Monitor React DevTools for component hierarchy and props

## Common Issues and Solutions

### Component Undefined Errors
If receiving "component undefined" errors:
1. Verify script loading order
2. Check component is assigned to window object
3. Ensure no syntax errors preventing component definition
4. Verify all parent objects exist before accessing nested properties

### React Loading Issues
If React is undefined:
1. Verify React scripts load before components
2. Check for network errors in script loading
3. Ensure React script URLs are correct and accessible
4. Verify no script blocking or loading race conditions

## Performance Considerations

### Memory Management
- Properly unmount React roots when removing components
- Clean up event listeners and intervals in useEffect cleanup functions
- Clear cached references when components are no longer needed

### Loading Optimization
- Consider using defer attribute for non-critical scripts
- Use production versions of React in production environment
- Minimize number of global variables created

Following these requirements ensures consistent behavior across browsers and prevents common issues related to using React without a build system.
