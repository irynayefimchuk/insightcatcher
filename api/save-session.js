/**
 * Vercel Serverless Function: Save research session to SharePoint
 * 
 * Saves session JSON file to: /sites/UserExperience/sessions/{study_id}/{yyyy}/{mm}/{session_id}.json
 * Uses Microsoft Graph API with service principal (OAuth M2M)
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session } = req.body;

    // Validate required credentials
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const driveId = process.env.SHAREPOINT_DRIVE_ID;

    if (!clientId || !clientSecret || !tenantId || !siteId || !driveId) {
      console.error('Missing Azure/SharePoint credentials in environment');
      return res.status(500).json({ error: 'Server configuration incomplete' });
    }

    // Step 1: Get access token from Azure AD
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token error:', error);
      return res.status(500).json({ error: 'Failed to authenticate with Azure' });
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Build file path and prepare content
    const sessionId = session.id || `sess_${Date.now()}`;
    const studyId = session.project_id || 'general';
    const now = new Date(session.session_start_time || new Date());
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Path in SharePoint: /sites/UserExperience/sessions/{study_id}/{yyyy}/{mm}/{session_id}.json
    const fileName = `${sessionId}.json`;
    const folderPath = `/sessions/${studyId}/${year}/${month}`;
    const fileContent = JSON.stringify(session, null, 2);

    // Step 3: Upload file to SharePoint via Graph API
    const uploadResponse = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${folderPath}/${fileName}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to save session to SharePoint' });
    }

    const uploadedFile = await uploadResponse.json();

    // Success
    console.log(`Session ${sessionId} saved to SharePoint`);
    return res.status(200).json({
      success: true,
      sessionId,
      path: `${folderPath}/${fileName}`,
      webUrl: uploadedFile.webUrl,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
