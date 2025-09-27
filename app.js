// app.js
(function() {
  const status = document.getElementById('status');

  function setStatus(msg) {
    status.textContent = msg;
  }

  // Load help content and initialize modal
  async function initializeHelpModal() {
    try {
      const response = await fetch('./help-content-template.html');
      const helpContent = await response.text();

      // Initialize help modal with actual content
      HelpModal.init({
        triggerSelector: '#btn-help',
        content: helpContent,
        theme: 'auto'
      });

      setStatus('Ready');
    } catch (error) {
      console.error('Failed to load help content:', error);
      // Fallback to placeholder content
      HelpModal.init({
        triggerSelector: '#btn-help',
        content: '<p>Help content could not be loaded. Please check that help-content-template.html exists.</p>',
        theme: 'auto'
      });
      setStatus('Ready (help content unavailable)');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHelpModal);
  } else {
    initializeHelpModal();
  }
})();
