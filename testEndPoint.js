const axios = require('axios');

const AGENT_ID = '0262cf55-8e5d-0031-bc6d-4bbfa1fb0b70';

// Simple test with a small payload
async function testEndpoint() {
  console.log('Testing endpoint with small payload...');
  
  try {
    const response = await axios.post(`http://localhost:3001/agents/${AGENT_ID}/memories/set`, {
      tableName: 'test_table',
      content: 'This is a test message to verify the endpoint is working correctly.'
    }, {
      timeout: 5000
    });
    
    console.log('Success! Endpoint is working.');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error testing endpoint:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testEndpoint();