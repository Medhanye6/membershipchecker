const crypto = require('crypto');
const querystring = require('querystring');
const fetch = require('node-fetch');

// 1. Telegram Bot Token is loaded from Vercel Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_SECRET = 'WebAppData';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Security Function: Validate Telegram initData ---
// This prevents unauthorized users from calling your API.
function validateInitData(initData) {
    if (!BOT_TOKEN) {
        console.error("BOT_TOKEN is not set.");
        return false;
    }
    
    // Convert the initData string into key-value pairs
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Sort all key=value pairs alphabetically and join them with \n
    const dataCheckString = Array.from(params.entries())
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n');

    // Create a secret key using HMAC-SHA256 based on the bot token
    const secretKey = crypto.createHmac('sha256', WEB_APP_SECRET)
        .update(BOT_TOKEN)
        .digest();

    // Calculate the HMAC-SHA256 hash for the data check string
    const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Compare the calculated hash with the hash received from Telegram
    return calculatedHash === hash;
}

// --- Bot API Function: Check Membership ---
async function checkMembership(channelUsername, userId) {
    // The chat_id must start with '@' or be a numerical ID
    const chatId = channelUsername.startsWith('@') ? channelUsername : `@${channelUsername}`;

    const url = `${TELEGRAM_API}/getChatMember?chat_id=${chatId}&user_id=${userId}`;

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.ok) {
            const status = result.result.status;
            // Statuses that count as a member
            return ['member', 'administrator', 'creator'].includes(status);
        } else {
            // The user might not exist in the chat, or the bot is not admin.
            // If the error is 'User not found', it means they are not a member.
            // For channels/groups, bot must be an administrator to use getChatMember.
            console.error("Telegram API Error:", result.description);
            // Assuming failure to check also means they are not confirmed as a member.
            return false;
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        return false;
    }
}

// --- Vercel Serverless Function Handler ---
module.exports = async (req, res) => {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body;
    try {
        body = req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { user_id, channel_username } = body;
    const initData = req.headers['x-telegram-init-data'];

    // 2. Critical Security Check: Validate initData
    if (!initData || !validateInitData(initData)) {
        return res.status(403).json({ error: 'Forbidden: Invalid Telegram initData' });
    }

    if (!user_id || !channel_username) {
        return res.status(400).json({ error: 'Missing user_id or channel_username in body' });
    }

    // 3. Perform Membership Check
    const isMember = await checkMembership(channel_username, user_id);

    // 4. Send Result
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ is_member: isMember });
};
