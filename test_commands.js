import { TickManager } from './classes/TickManager.js';

// Create a test tick manager
const tm = new TickManager(true);

// Helper to send a command
function sendCommand(cmd, actor = 'w', loc = '2', niceness = 0) {
  console.log(`\n>>> Sending command: "${cmd}"`);
  tm.commandManager.add({ cmd, actor, loc, niceness });
  tm.doNext();
}

// Helper to check if an object is hosted by another
function checkHost(hostId, targetId) {
  const hostObj = tm.objectManager.getById(hostId);
  const targetObj = tm.objectManager.getById(targetId);
  
  console.log(`\n--- Checking host relationship ---`);
  console.log(`Host object (${hostId}):`, hostObj ? hostObj.name : 'not found');
  console.log(`Target object (${targetId}):`, targetObj ? targetObj.name : 'not found');
  
  if (hostObj && hostObj.host) {
    console.log(`Host's host field:`, hostObj.host);
    const isHosted = Array.isArray(hostObj.host) && hostObj.host.includes(targetId);
    console.log(`Is target hosted? ${isHosted}`);
    return isHosted;
  }
  
  console.log('Host field not found or empty');
  return false;
}


// Helper to print all objects in a location
function printObjectsInLoc(locId) {
  const ids = tm.objectManager.findInLoc(locId);
  console.log(`\n--- Objects in location ${locId} ---`);
  console.log('IDs:', [...ids]);
  ids.forEach(id => {
    const obj = tm.objectManager.getById(id);
    if (obj) {
      console.log(`  ${id}: ${obj.name} (class: ${obj.class})`);
      if (obj.host) console.log(`    host: ${obj.host}`);
    }
  });
}

// Run tests
console.log('=== Testing Commands ===');

// Test 1: Create a cat
sendCommand('create a small black cat');

// Test 2: Create a box
sendCommand('create a large brown box');

// Wait a bit for processing
setTimeout(() => {
  // Test 3: Put cat on box
  sendCommand('put the cat on the box');
  
  setTimeout(() => {
    // Print messages
    tm.messageManager.show();
    
    // Find the cat and box IDs (we need to look them up)
    const catIds = tm.objectManager.findByName('cat');
    const boxIds = tm.objectManager.findByName('box');
    
    console.log('\n--- Found objects ---');
    console.log('Cat IDs:', catIds ? [...catIds] : 'none');
    console.log('Box IDs:', boxIds ? [...boxIds] : 'none');
    
    // Print objects in location 2
    printObjectsInLoc('2');
    
  }, 100);
}, 100);

// Keep process alive to allow async operations
setTimeout(() => {
  console.log('\n=== Tests complete ===');
  process.exit(0);
}, 500);
