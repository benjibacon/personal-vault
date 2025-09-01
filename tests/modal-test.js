/**
 * Modal System Test Suite
 * Comprehensive tests for the modal system module
 */

// Mock EventBus for testing
class MockEventBus {
    constructor() {
        this.listeners = new Map();
        this.emittedEvents = [];
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        this.emittedEvents.push({ event, data, timestamp: Date.now() });
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    getEmittedEvents() {
        return this.emittedEvents;
    }

    clearEmittedEvents() {
        this.emittedEvents = [];
    }
}

// Test utilities
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function queryModal(modalId) {
    return document.getElementById(modalId);
}

function isModalVisible(modalId) {
    const modal = queryModal(modalId);
    return modal && modal.classList.contains('show');
}

// Test Suite
class ModalSystemTests {
    constructor() {
        this.eventBus = new MockEventBus();
        this.modalSystem = null;
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Modal System Test Suite...\n');
        
        // Initialize modal system
        await this.setup();
        
        // Run individual tests
        await this.testBasicModalCreation();
        await this.testModalWithButtons();
        await this.testEventBusIntegration();
        await this.testMultipleModals();
        await this.testModalUpdates();
        await this.testKeyboardHandling();
        await this.testAccessibility();
        await this.testCleanup();
        
        // Cleanup
        await this.teardown();
        
        // Report results
        this.reportResults();
        
        return this.testResults;
    }

    async setup() {
        // Import and initialize the modal system
        const { default: ModalSystemModule } = await import('./modal-system.js');
        this.modalSystem = await ModalSystemModule.init(this.eventBus);
    }

    async teardown() {
        if (this.modalSystem) {
            this.modalSystem.destroy();
        }
        // Clean up any remaining modals in DOM
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    }

    async testBasicModalCreation() {
        console.log('Test 1: Basic Modal Creation');
        
        try {
            const modalId = this.modalSystem.getAPI().show({
                id: 'test-modal-1',
                title: 'Test Modal',
                body: 'This is a test modal body.'
            });

            // Check modal was created
            this.assert(modalId === 'test-modal-1', 'Modal ID should be returned');
            
            // Wait for animation
            await wait(100);
            
            // Check modal is visible
            this.assert(isModalVisible('test-modal-1'), 'Modal should be visible');
            
            // Check content
            const modal = queryModal('test-modal-1');
            const title = modal.querySelector('.modal-title');
            const body = modal.querySelector('.modal-body');
            
            this.assert(title.textContent === 'Test Modal', 'Title should be set correctly');
            this.assert(body.textContent.includes('This is a test modal body'), 'Body should be set correctly');
            
            // Close modal
            this.modalSystem.getAPI().hide('test-modal-1');
            await wait(350); // Animation + cleanup time
            
            this.assert(!queryModal('test-modal-1'), 'Modal should be removed from DOM');
            
            this.pass('Basic Modal Creation');
        } catch (error) {
            this.fail('Basic Modal Creation', error.message);
        }
    }

    async testModalWithButtons() {
        console.log('Test 2: Modal with Buttons');
        
        try {
            let buttonClicked = null;
            
            const modalId = this.modalSystem.getAPI().show({
                id: 'test-modal-2',
                title: 'Modal with Buttons',
                body: 'This modal has buttons.',
                buttons: [
                    {
                        text: 'Cancel',
                        variant: 'secondary',
                        action: () => { buttonClicked = 'cancel'; }
                    },
                    {
                        text: 'Save',
                        variant: 'primary',
                        action: () => { buttonClicked = 'save'; }
                    }
                ]
            });

            await wait(100);
            
            // Check buttons exist
            const modal = queryModal('test-modal-2');
            const buttons = modal.querySelectorAll('.modal-btn');
            
            this.assert(buttons.length === 2, 'Should have 2 buttons');
            this.assert(buttons[0].textContent === 'Cancel', 'First button should be Cancel');
            this.assert(buttons[1].textContent === 'Save', 'Second button should be Save');
            
            // Click save button
            buttons[1].click();
            await wait(350);
            
            this.assert(buttonClicked === 'save', 'Button action should be executed');
            this.assert(!queryModal('test-modal-2'), 'Modal should auto-close after button click');
            
            this.pass('Modal with Buttons');
        } catch (error) {
            this.fail('Modal with Buttons', error.message);
        }
    }

    async testEventBusIntegration() {
        console.log('Test 3: Event Bus Integration');
        
        try {
            this.eventBus.clearEmittedEvents();
            
            // Show modal via event bus
            this.eventBus.emit('modal:show', {
                id: 'test-modal-3',
                title: 'Event Bus Modal',
                body: 'Shown via event bus'
            });

            await wait(100);
            
            // Check modal is shown
            this.assert(isModalVisible('test-modal-3'), 'Modal should be shown via event bus');
            
            // Hide modal via event bus
            this.eventBus.emit('modal:hide', { modalId: 'test-modal-3' });
            await wait(350);
            
            this.assert(!queryModal('test-modal-3'), 'Modal should be hidden via event bus');
            
            // Check events were emitted
            const events = this.eventBus.getEmittedEvents();
            const shownEvent = events.find(e => e.event === 'modal:shown');
            const hiddenEvent = events.find(e => e.event === 'modal:hidden');
            
            this.assert(shownEvent, 'modal:shown event should be emitted');
            this.assert(hiddenEvent, 'modal:hidden event should be emitted');
            
            this.pass('Event Bus Integration');
        } catch (error) {
            this.fail('Event Bus Integration', error.message);
        }
    }

    async testMultipleModals() {
        console.log('Test 4: Multiple Modals');
        
        try {
            // Show first modal
            this.modalSystem.getAPI().show({
                id: 'modal-a',
                title: 'Modal A',
                body: 'First modal'
            });

            // Show second modal
            this.modalSystem.getAPI().show({
                id: 'modal-b',
                title: 'Modal B',
                body: 'Second modal'
            });

            await wait(100);
            
            // Check both modals exist
            this.assert(isModalVisible('modal-a'), 'Modal A should be visible');
            this.assert(isModalVisible('modal-b'), 'Modal B should be visible');
            
            // Check z-index stacking
            const modalA = queryModal('modal-a');
            const modalB = queryModal('modal-b');
            const zIndexA = parseInt(modalA.style.zIndex);
            const zIndexB = parseInt(modalB.style.zIndex);
            
            this.assert(zIndexB > zIndexA, 'Second modal should have higher z-index');
            
            // Check active modals API
            const activeModals = this.modalSystem.getAPI().getActive();
            this.assert(activeModals.length === 2, 'Should have 2 active modals');
            this.assert(activeModals.includes('modal-a'), 'Should include modal-a');
            this.assert(activeModals.includes('modal-b'), 'Should include modal-b');
            
            // Close all modals
            this.modalSystem.getAPI().closeAll();
            await wait(350);
            
            this.assert(!this.modalSystem.getAPI().hasActive(), 'Should have no active modals');
            
            this.pass('Multiple Modals');
        } catch (error) {
            this.fail('Multiple Modals', error.message);
        }
    }

    async testModalUpdates() {
        console.log('Test 5: Modal Updates');
        
        try {
            const modalId = this.modalSystem.getAPI().show({
                id: 'test-modal-5',
                title: 'Original Title',
                body: 'Original body'
            });

            await wait(100);
            
            // Update modal content
            this.modalSystem.getAPI().update('test-modal-5', {
                title: 'Updated Title',
                body: 'Updated body content'
            });

            const modal = queryModal('test-modal-5');
            const title = modal.querySelector('.modal-title');
            const body = modal.querySelector('.modal-body');
            
            this.assert(title.textContent === 'Updated Title', 'Title should be updated');
            this.assert(body.textContent === 'Updated body content', 'Body should be updated');
            
            // Test updating buttons
            this.modalSystem.getAPI().update('test-modal-5', {
                buttons: [
                    {
                        text: 'New Button',
                        variant: 'primary',
                        action: () => {}
                    }
                ]
            });

            const buttons = modal.querySelectorAll('.modal-btn');
            this.assert(buttons.length === 1, 'Should have 1 button after update');
            this.assert(buttons[0].textContent === 'New Button', 'Button text should be updated');
            
            this.modalSystem.getAPI().hide('test-modal-5');
            await wait(350);
            
            this.pass('Modal Updates');
        } catch (error) {
            this.fail('Modal Updates', error.message);
        }
    }

    async testKeyboardHandling() {
        console.log('Test 6: Keyboard Handling');
        
        try {
            this.modalSystem.getAPI().show({
                id: 'test-modal-6',
                title: 'Keyboard Test',
                body: 'Press Escape to close'
            });

            await wait(100);
            
            // Simulate Escape key press
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(escapeEvent);
            await wait(350);
            
            this.assert(!queryModal('test-modal-6'), 'Modal should close on Escape key');
            
            this.pass('Keyboard Handling');
        } catch (error) {
            this.fail('Keyboard Handling', error.message);
        }
    }

    async testAccessibility() {
        console.log('Test 7: Accessibility');
        
        try {
            this.modalSystem.getAPI().show({
                id: 'test-modal-7',
                title: 'Accessibility Test',
                body: '<input type="text" placeholder="Test input">'
            });

            await wait(100);
            
            const modal = queryModal('test-modal-7');
            
            // Check ARIA attributes
            this.assert(modal.getAttribute('role') === 'dialog', 'Should have dialog role');
            this.assert(modal.getAttribute('aria-modal') === 'true', 'Should have aria-modal=true');
            this.assert(modal.hasAttribute('aria-labelledby'), 'Should have aria-labelledby');
            
            // Check title ID matches aria-labelledby
            const titleId = modal.getAttribute('aria-labelledby');
            const title = modal.querySelector(`#${titleId}`);
            this.assert(title, 'Title element should exist with correct ID');
            
            // Check close button has proper label
            const closeBtn = modal.querySelector('.modal-close');
            this.assert(closeBtn.getAttribute('aria-label') === 'Close modal', 'Close button should have aria-label');
            
            this.modalSystem.getAPI().hide('test-modal-7');
            await wait(350);
            
            this.pass('Accessibility');
        } catch (error) {
            this.fail('Accessibility', error.message);
        }
    }

    async testCleanup() {
        console.log('Test 8: Cleanup and Destruction');
        
        try {
            // Create some modals
            this.modalSystem.getAPI().show({
                id: 'cleanup-modal-1',
                title: 'Test 1',
                body: 'Body 1'
            });
            
            this.modalSystem.getAPI().show({
                id: 'cleanup-modal-2',
                title: 'Test 2',
                body: 'Body 2'
            });

            await wait(100);
            
            // Verify modals exist
            this.assert(this.modalSystem.getAPI().hasActive(), 'Should have active modals before cleanup');
            
            // Destroy modal system
            this.modalSystem.destroy();
            
            // Check cleanup
            this.assert(!queryModal('cleanup-modal-1'), 'Modal 1 should be cleaned up');
            this.assert(!queryModal('cleanup-modal-2'), 'Modal 2 should be cleaned up');
            
            // Check styles are removed
            const styles = document.getElementById('modal-system-styles');
            this.assert(!styles, 'Styles should be removed');
            
            this.pass('Cleanup and Destruction');
        } catch (error) {
            this.fail('Cleanup and Destruction', error.message);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    pass(testName) {
        console.log(`✅ ${testName} - PASSED`);
        this.testResults.push({ test: testName, status: 'PASSED' });
    }

    fail(testName, error) {
        console.log(`❌ ${testName} - FAILED: ${error}`);
        this.testResults.push({ test: testName, status: 'FAILED', error });
    }

    reportResults() {
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const total = this.testResults.length;
        
        console.log('\n📊 Test Results Summary:');
        console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
        }
        
        console.log(`\n${failed === 0 ? '🎉' : '⚠️'} Modal System Tests ${failed === 0 ? 'Complete' : 'Complete with Failures'}`);
    }
}

// Manual Test HTML Generator
function generateManualTestPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modal System Manual Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        
        .test-section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        
        .test-button {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
        }
        
        .test-button:hover {
            background: #1976D2;
        }
        
        .test-button.secondary {
            background: #6c757d;
        }
        
        .test-button.secondary:hover {
            background: #5a6268;
        }
        
        .log {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h1>Modal System Manual Testing</h1>
    <p>Use the buttons below to manually test modal system functionality:</p>
    
    <div class="test-section">
        <h3>Basic Modals</h3>
        <button class="test-button" onclick="showBasicModal()">Show Basic Modal</button>
        <button class="test-button" onclick="showModalWithForm()">Show Modal with Form</button>
        <button class="test-button" onclick="showConfirmationModal()">Show Confirmation Modal</button>
    </div>
    
    <div class="test-section">
        <h3>Advanced Features</h3>
        <button class="test-button" onclick="showMultipleModals()">Show Multiple Modals</button>
        <button class="test-button" onclick="updateModalTest()">Update Modal Test</button>
        <button class="test-button" onclick="showScrollableModal()">Show Scrollable Modal</button>
    </div>
    
    <div class="test-section">
        <h3>Edge Cases</h3>
        <button class="test-button" onclick="showModalWithoutButtons()">Modal without Buttons</button>
        <button class="test-button" onclick="showModalWithCustomSize()">Custom Size Modal</button>
        <button class="test-button secondary" onclick="closeAllModals()">Close All Modals</button>
    </div>
    
    <div class="test-section">
        <h3>Event Log</h3>
        <div id="eventLog" class="log">Ready for testing...</div>
        <button class="test-button secondary" onclick="clearLog()">Clear Log</button>
    </div>

    <script type="module">
        import ModalSystemModule from './modal-system.js';
        
        // Mock event bus for manual testing
        const eventBus = {
            listeners: new Map(),
            on(event, callback) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event).push(callback);
            },
            off(event, callback) {
                if (this.listeners.has(event)) {
                    const callbacks = this.listeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            },
            emit(event, data) {
                log(\`Event: \${event}\`, data);
                if (this.listeners.has(event)) {
                    this.listeners.get(event).forEach(callback => callback(data));
                }
            }
        };
        
        // Initialize modal system
        const modalSystem = await ModalSystemModule.init(eventBus);
        
        // Make modal system available globally for manual testing
        window.modalSystem = modalSystem;
        
        // Logging function
        window.log = function(message, data = null) {
            const logEl = document.getElementById('eventLog');
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = \`[\${timestamp}] \${message}\`;
            
            if (data) {
                console.log(logMessage, data);
                logEl.textContent += \`\${logMessage} \${JSON.stringify(data, null, 2)}\\n\`;
            } else {
                console.log(logMessage);
                logEl.textContent += \`\${logMessage}\\n\`;
            }
            
            logEl.scrollTop = logEl.scrollHeight;
        };
        
        // Test functions
        window.showBasicModal = function() {
            modalSystem.getAPI().show({
                id: 'basic-modal',
                title: 'Basic Modal',
                body: '<p>This is a basic modal with default settings.</p><p>Click outside or press Escape to close.</p>'
            });
        };
        
        window.showModalWithForm = function() {
            const formHTML = \`
                <form id="testForm">
                    <div style="margin-bottom: 15px;">
                        <label for="name" style="display: block; margin-bottom: 5px;">Name:</label>
                        <input type="text" id="name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="email" style="display: block; margin-bottom: 5px;">Email:</label>
                        <input type="email" id="email" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label for="message" style="display: block; margin-bottom: 5px;">Message:</label>
                        <textarea id="message" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                </form>
            \`;
            
            modalSystem.getAPI().show({
                id: 'form-modal',
                title: 'Modal with Form',
                body: formHTML,
                buttons: [
                    {
                        text: 'Cancel',
                        variant: 'secondary',
                        action: () => log('Form cancelled')
                    },
                    {
                        text: 'Submit',
                        variant: 'primary',
                        action: (modalId) => {
                            const form = document.getElementById('testForm');
                            const formData = new FormData(form);
                            const data = Object.fromEntries(formData);
                            log('Form submitted', data);
                            return true; // Allow modal to close
                        }
                    }
                ]
            });
        };
        
        window.showConfirmationModal = function() {
            modalSystem.getAPI().show({
                id: 'confirm-modal',
                title: 'Confirm Action',
                body: '<p>Are you sure you want to delete this item?</p><p><strong>This action cannot be undone.</strong></p>',
                buttons: [
                    {
                        text: 'Cancel',
                        variant: 'secondary',
                        action: () => log('Action cancelled')
                    },
                    {
                        text: 'Delete',
                        variant: 'primary',
                        action: () => {
                            log('Item deleted');
                            // Simulate some action
                            setTimeout(() => log('Deletion completed'), 1000);
                        }
                    }
                ]
            });
        };
        
        window.showMultipleModals = function() {
            modalSystem.getAPI().show({
                id: 'modal-1',
                title: 'First Modal',
                body: '<p>This is the first modal.</p>',
                buttons: [
                    {
                        text: 'Show Second Modal',
                        variant: 'primary',
                        action: () => {
                            modalSystem.getAPI().show({
                                id: 'modal-2',
                                title: 'Second Modal',
                                body: '<p>This is the second modal, stacked on top.</p>',
                                buttons: [
                                    {
                                        text: 'Show Third Modal',
                                        variant: 'primary',
                                        action: () => {
                                            modalSystem.getAPI().show({
                                                id: 'modal-3',
                                                title: 'Third Modal',
                                                body: '<p>This is the third modal. Try pressing Escape!</p>'
                                            });
                                            return false; // Don't close this modal
                                        }
                                    }
                                ]
                            });
                            return false; // Don't close this modal
                        }
                    }
                ]
            });
        };
        
        window.updateModalTest = function() {
            const modalId = modalSystem.getAPI().show({
                id: 'update-modal',
                title: 'Original Title',
                body: '<p>Original content</p>',
                buttons: [
                    {
                        text: 'Update Content',
                        variant: 'primary',
                        action: () => {
                            modalSystem.getAPI().update('update-modal', {
                                title: 'Updated Title!',
                                body: '<p><strong>Updated content!</strong></p><p>The modal has been updated dynamically.</p>',
                                buttons: [
                                    {
                                        text: 'Reset',
                                        variant: 'secondary',
                                        action: () => {
                                            modalSystem.getAPI().update('update-modal', {
                                                title: 'Original Title',
                                                body: '<p>Original content</p>'
                                            });
                                            return false;
                                        }
                                    },
                                    {
                                        text: 'Done',
                                        variant: 'primary',
                                        action: () => log('Update test completed')
                                    }
                                ]
                            });
                            return false; // Don't close modal
                        }
                    }
                ]
            });
        };
        
        window.showScrollableModal = function() {
            const longContent = Array.from({length: 50}, (_, i) => 
                \`<p>This is paragraph \${i + 1} of the long content. It demonstrates how the modal handles scrollable content.</p>\`
            ).join('');
            
            modalSystem.getAPI().show({
                id: 'scrollable-modal',
                title: 'Scrollable Content Modal',
                body: longContent,
                maxWidth: '600px'
            });
        };
        
        window.showModalWithoutButtons = function() {
            modalSystem.getAPI().show({
                id: 'no-buttons-modal',
                title: 'No Buttons Modal',
                body: '<p>This modal has no footer buttons.</p><p>Close by clicking outside or pressing Escape.</p>'
            });
        };
        
        window.showModalWithCustomSize = function() {
            modalSystem.getAPI().show({
                id: 'custom-size-modal',
                title: 'Custom Size Modal',
                body: '<p>This modal has custom width settings.</p>',
                width: '300px',
                maxWidth: '400px'
            });
        };
        
        window.closeAllModals = function() {
            modalSystem.getAPI().closeAll();
            log('All modals closed');
        };
        
        window.clearLog = function() {
            document.getElementById('eventLog').textContent = 'Log cleared...\\n';
        };
        
        log('Manual test page loaded successfully');
    </script>
</body>
</html>
    `;
}

// Export test utilities
export {
    ModalSystemTests,
    MockEventBus,
    generateManualTestPage
};

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
    // Browser environment - wait for DOM
    document.addEventListener('DOMContentLoaded', async () => {
        if (window.location.search.includes('autotest')) {
            const tests = new ModalSystemTests();
            await tests.runAllTests();
        }
    });
}
