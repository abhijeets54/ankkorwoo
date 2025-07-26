/**
 * QStash integration for scheduled tasks and background jobs
 */

interface QStashResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a test message to QStash
 * @param data - Data to include in the test message
 * @param delaySeconds - Optional delay in seconds
 * @returns Promise with the result of the operation
 */
export async function sendQStashTestMessage(data: any, delaySeconds?: number): Promise<QStashResult> {
  try {
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Simulating QStash test message');
      console.log('Test data:', data);
      console.log('Delay:', delaySeconds ? `${delaySeconds} seconds` : 'none');
      
      return {
        success: true,
        messageId: 'dev-mode-' + Date.now()
      };
    }
    
    // In production, we would use QStash to send the message
    // This is a placeholder for the actual implementation
    const response = await fetch('/api/qstash-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        delay: delaySeconds
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send QStash test message: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      messageId: result.id || 'unknown'
    };
  } catch (error) {
    console.error('Error sending QStash test message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 