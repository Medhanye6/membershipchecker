// Create a new file: member-checker/api/check.js
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Replace with your bot token and channel username
const BOT_TOKEN = '8262401976:AAGh3XZ1HDrzRn25xr9yZNJrp04LqfQ2WJE';
const CHANNEL_USERNAME = '@MesobEarn';

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if user is a member of the channel
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`
    );
    
    const data = await response.json();
    
    if (data.ok) {
      const status = data.result.status;
      const isMember = ['member', 'administrator', 'creator'].includes(status);
      
      return res.status(200).json({ 
        isMember,
        status,
        channel: CHANNEL_USERNAME
      });
    } else {
      return res.status(500).json({ error: 'Failed to check membership status' });
    }
  } catch (error) {
    console.error('Error checking membership:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
