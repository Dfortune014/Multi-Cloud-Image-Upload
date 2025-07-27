import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, addCorsHeaders } from '@/lib/cors';

export async function POST(req: NextRequest) {
  // Handle CORS preflight requests
  const corsResponse = corsMiddleware(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { fileName, fileSize, uploadTime } = body;

    // Validate required fields
    if (!fileName) {
      const response = NextResponse.json({ 
        error: 'Missing required field: fileName is required' 
      }, { status: 400 });
      return addCorsHeaders(response, req);
    }

    // Log upload completion for audit purposes
    console.log(`GCP upload completed for file: ${fileName}, size: ${fileSize || 'unknown'}, time: ${uploadTime || new Date().toISOString()}`);

    // TODO: Create a database with file metadata

    const response = NextResponse.json({
      message: 'GCP upload completion recorded successfully',
      fileName,
      recordedAt: new Date().toISOString()
    });
    
    return addCorsHeaders(response, req);

  } catch (err) {
    console.error('GCP upload completion notification failed:', err);
    const response = NextResponse.json({ 
      error: 'Failed to record upload completion', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
    return addCorsHeaders(response, req);
  }
} 