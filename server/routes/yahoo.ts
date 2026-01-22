import { Router, Request, Response } from 'express';
import { YahooImapService } from '../services/yahooImapService';

const router = Router();

// POST /api/yahoo/connect - Connect to Yahoo Mail
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { email, appPassword } = req.body;

    if (!email || !appPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email and app password are required',
      });
    }

    console.log(`[Yahoo API] Connecting: ${email}`);
    const result = await YahooImapService.connect(email, appPassword);

    if (result.success) {
      res.json({ success: true, message: 'Connected to Yahoo Mail' });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Failed to connect',
      });
    }
  } catch (error: any) {
    console.error('[Yahoo API] Connect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// GET /api/yahoo/emails - Fetch emails
router.get('/emails', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required',
      });
    }

    if (!YahooImapService.isConnected(email)) {
      return res.status(401).json({
        success: false,
        error: 'Not connected. Please connect first.',
      });
    }

    console.log(`[Yahoo API] Fetching emails for: ${email}`);
    const emails = await YahooImapService.fetchEmails(email, limit);

    res.json({
      success: true,
      emails,
      count: emails.length,
    });
  } catch (error: any) {
    console.error('[Yahoo API] Fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch emails',
    });
  }
});

// GET /api/yahoo/email/:id - Fetch single email with full content
router.get('/email/:id', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const messageId = req.params.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required',
      });
    }

    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
      });
    }

    if (!YahooImapService.isConnected(email)) {
      return res.status(401).json({
        success: false,
        error: 'Not connected. Please connect first.',
      });
    }

    console.log(`[Yahoo API] Fetching email detail: ${messageId} for: ${email}`);
    const emailDetail = await YahooImapService.fetchEmailDetail(email, messageId);

    res.json({
      success: true,
      email: emailDetail,
    });
  } catch (error: any) {
    console.error('[Yahoo API] Fetch email detail error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch email detail',
    });
  }
});

// POST /api/yahoo/trash - Move emails to trash
router.post('/trash', async (req: Request, res: Response) => {
  try {
    const { email, messageIds } = req.body;

    if (!email || !messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Email and messageIds array are required',
      });
    }

    if (!YahooImapService.isConnected(email)) {
      return res.status(401).json({
        success: false,
        error: 'Not connected. Please connect first.',
      });
    }

    console.log(`[Yahoo API] Trashing ${messageIds.length} emails for: ${email}`);
    const result = await YahooImapService.trashEmails(email, messageIds);

    res.json(result);
  } catch (error: any) {
    console.error('[Yahoo API] Trash error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trash emails',
      trashedCount: 0,
      failedIds: [],
    });
  }
});

// POST /api/yahoo/disconnect - Disconnect from Yahoo Mail
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    await YahooImapService.disconnect(email);

    res.json({ success: true, message: 'Disconnected from Yahoo Mail' });
  } catch (error: any) {
    console.error('[Yahoo API] Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect',
    });
  }
});

// GET /api/yahoo/status - Check connection status
router.get('/status', (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email parameter is required',
    });
  }

  const connected = YahooImapService.isConnected(email);

  res.json({
    success: true,
    connected,
    email,
  });
});

export default router;
