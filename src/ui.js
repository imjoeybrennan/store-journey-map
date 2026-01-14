/**
 * UI module
 * Creates and manages the user interface elements
 */

/**
 * Creates the UI placeholder in the container
 * @param {HTMLElement} container - The UI container element
 */
export function createUI(container) {
  if (!container) {
    console.warn('UI container not found');
    return;
  }

  // Create placeholder wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'ui-wrapper';
  wrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #fff;
  `;

  // Placeholder text
  const placeholder = document.createElement('div');
  placeholder.textContent = 'UI Controls';
  placeholder.style.cssText = `
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
    margin-bottom: 4px;
  `;
  wrapper.appendChild(placeholder);

  // Restart button placeholder (disabled for now)
  const restartButton = document.createElement('button');
  restartButton.id = 'restart-button';
  restartButton.textContent = '↺ Restart';
  restartButton.disabled = true;
  restartButton.style.cssText = `
    padding: 8px 16px;
    background: #333;
    border: 1px solid #555;
    border-radius: 4px;
    color: #666;
    cursor: not-allowed;
    font-family: inherit;
    font-size: 12px;
    transition: all 0.2s ease;
  `;
  wrapper.appendChild(restartButton);

  container.appendChild(wrapper);
  
  console.log('UI created');
}

/**
 * Enable the restart button with a callback
 * @param {Function} onRestart - Callback function when restart is clicked
 */
export function enableRestartButton(onRestart) {
  const button = document.getElementById('restart-button');
  if (!button) return;

  button.disabled = false;
  button.style.background = '#4a4a4a';
  button.style.color = '#fff';
  button.style.cursor = 'pointer';
  button.style.borderColor = '#666';

  button.addEventListener('mouseenter', () => {
    button.style.background = '#5a5a5a';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#4a4a4a';
  });

  button.addEventListener('click', () => {
    if (typeof onRestart === 'function') {
      onRestart();
    }
  });
}

/**
 * Disable the restart button
 */
export function disableRestartButton() {
  const button = document.getElementById('restart-button');
  if (!button) return;

  button.disabled = true;
  button.style.background = '#333';
  button.style.color = '#666';
  button.style.cursor = 'not-allowed';
  button.style.borderColor = '#555';
}
